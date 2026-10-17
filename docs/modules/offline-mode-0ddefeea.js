'use strict';

/**
 * offline-mode.js — STAKK reste utilisable quand le serveur STAKK ne répond plus.
 *
 * STAKK n'est plus maintenu. Ce plugin, chargé en premier par hot-modules,
 * intercepte les appels https vers le serveur de licence. Tant que le serveur
 * répond, rien ne change. S'il est injoignable (erreur réseau, timeout, 5xx,
 * réponse qui n'est pas du JSON), le plugin répond à sa place : licence
 * valide, heartbeat accepté, token de lancement délivré.
 *
 * `https` est un singleton partagé avec license.js : le patch couvre donc le
 * build Windows (pkg) comme le bundle Mac (ncc), sans toucher à l'exe.
 *
 * Sans session enregistrée (.license absent) et serveur injoignable, le plugin
 * en écrit une locale pour que l'interface ne demande pas de connexion.
 */

module.exports = function createOfflineMode(deps) {
  const { https, fs, path, crypto, spawn, APP_ROOT } = deps;
  const log = deps.log || (() => {});
  const { PassThrough } = require('stream');
  const { EventEmitter } = require('events');

  const SERVER = new URL(process.env.STAKK_SERVER || 'https://stakk-server.fly.dev');
  const LICENSE_FILE = path.join(APP_ROOT, '.license');
  const TIMEOUT_MS = 8000;
  // Après un échec, on ne retente le vrai serveur qu'au bout d'une minute :
  // sinon chaque appel paierait le timeout complet.
  const DOWN_TTL_MS = 60 * 1000;

  let downUntil = 0;
  let announced = false;

  function markDown(why) {
    downUntil = Date.now() + DOWN_TTL_MS;
    if (!announced) {
      announced = true;
      log(`[offline-mode] serveur STAKK injoignable (${why}) — mode hors ligne`);
    }
  }

  // Réponses servies à la place du serveur. Tout le reste reçoit un 503.
  function fakeResponse(method, pathname) {
    const key = `${method} ${pathname}`;
    switch (key) {
      case 'GET /api/license':
        return [200, { active: true, unlimited: true, remaining: -1, expires: null, trialAvailable: false }];
      case 'POST /api/heartbeat':
      case 'POST /api/hwid':
        return [200, { ok: true }];
      case 'POST /api/launch/token':
        return [200, { token: 'stakk-offline' }];
      case 'GET /api/free-mode':
        return [200, { enabled: true }];
      case 'GET /api/me':
        return [200, { username: 'hors-ligne', github_starred: true, sharing_trusted: false }];
      default:
        return [503, { error: 'Serveur STAKK injoignable' }];
    }
  }

  function makeRes(status, headers, body) {
    const res = new PassThrough();
    res.statusCode = status;
    res.headers = headers;
    process.nextTick(() => res.end(body));
    return res;
  }

  function targetOf(args) {
    const a = args[0];
    if (typeof a === 'string' || a instanceof URL) {
      try {
        const u = new URL(String(a));
        const opts = args[1] && typeof args[1] === 'object' ? args[1] : {};
        return { host: u.hostname, path: u.pathname, method: (opts.method || 'GET').toUpperCase() };
      } catch { return null; }
    }
    if (a && typeof a === 'object') {
      const host = String(a.hostname || a.host || '').replace(/:\d+$/, '');
      const p = String(a.path || '/').split('?')[0];
      return { host, path: p, method: (a.method || 'GET').toUpperCase() };
    }
    return null;
  }

  const origRequest = https.request;

  function interceptedRequest(...args) {
    const target = targetOf(args);
    if (!target || target.host !== SERVER.hostname) return origRequest.apply(https, args);

    const cb = args.find(x => typeof x === 'function');
    const realArgs = args.filter(x => typeof x !== 'function');
    const req = new EventEmitter();
    const chunks = [];
    let done = false;

    function deliver(res) {
      if (done) return;
      done = true;
      if (cb) cb(res);
      req.emit('response', res);
    }
    function deliverFake() {
      const [status, data] = fakeResponse(target.method, target.path);
      deliver(makeRes(status, { 'content-type': 'application/json' }, JSON.stringify(data)));
    }

    req.write = (c) => { if (c) chunks.push(Buffer.from(c)); return true; };
    req.setHeader = () => {};
    req.setTimeout = () => req;
    req.destroy = req.abort = () => { done = true; };
    req.end = (c) => {
      if (c && typeof c !== 'function') chunks.push(Buffer.from(c));
      if (Date.now() < downUntil) { process.nextTick(deliverFake); return req; }

      let real;
      try { real = origRequest.apply(https, realArgs); }
      catch (e) { markDown(e.message); process.nextTick(deliverFake); return req; }
      // Garde `done` : avec keep-alive, le socket peut expirer ou se fermer
      // après une réponse déjà livrée, ce qui n'est pas une panne serveur.
      real.setTimeout(TIMEOUT_MS, () => { if (done) return; markDown('timeout'); real.destroy(); deliverFake(); });
      real.on('error', e => { if (done) return; markDown(e.code || e.message); deliverFake(); });
      real.on('response', res => {
        const body = [];
        res.on('data', d => body.push(d));
        res.on('error', e => { if (done) return; markDown(e.message); deliverFake(); });
        res.on('end', () => {
          const buf = Buffer.concat(body);
          let json = true;
          try { JSON.parse(buf.toString('utf8')); } catch { json = false; }
          if (res.statusCode >= 500 || !json) {
            markDown(`HTTP ${res.statusCode}`);
            deliverFake();
            return;
          }
          downUntil = 0;
          deliver(makeRes(res.statusCode, res.headers, buf));
        });
      });
      for (const c of chunks) real.write(c);
      real.end();
      return req;
    };
    return req;
  }

  https.request = interceptedRequest;

  // ─── Session locale si aucune n'existe ──────────────────────────────────
  // Même format que license.js : AES-256-GCM, clé dérivée du HWID.

  function run(cmd, args) {
    return new Promise(resolve => {
      let out = '';
      try {
        const p = spawn(cmd, args, { windowsHide: true });
        p.stdout.on('data', d => { out += d; });
        p.on('error', () => resolve(''));
        p.on('close', () => resolve(out));
      } catch { resolve(''); }
    });
  }

  async function machineId() {
    if (process.platform === 'win32') {
      const out = await run('reg', ['QUERY', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid']);
      const m = out.match(/MachineGuid\s+REG_SZ\s+([a-f0-9-]+)/i);
      return m ? m[1] : 'unknown-windows';
    }
    if (process.platform === 'darwin') {
      const out = await run('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice']);
      const m = out.match(/IOPlatformUUID"\s*=\s*"([^"]+)"/);
      return m ? m[1].toLowerCase() : 'unknown-mac';
    }
    for (const f of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
      try { return fs.readFileSync(f, 'utf8').trim(); } catch {}
    }
    return 'unknown-linux';
  }

  function encrypt(obj, hwid) {
    const key = crypto.scryptSync(hwid, 'stakk-v1-license', 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(obj), 'utf8')), cipher.final()]);
    return 'STAKK1:' + Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
  }

  function probe() {
    return new Promise(resolve => {
      const req = https.request(new URL('/api/free-mode', SERVER), { method: 'GET' }, res => {
        res.resume();
        res.on('end', () => resolve());
      });
      req.on('error', () => resolve());
      req.end();
    });
  }

  const ready = (async () => {
    if (fs.existsSync(LICENSE_FILE)) return;
    await probe();
    if (Date.now() >= downUntil) return; // serveur joignable : connexion normale
    const hwid = crypto.createHash('sha256').update(await machineId()).digest('hex');
    fs.writeFileSync(LICENSE_FILE, encrypt({ token: 'stakk-offline', username: 'hors-ligne', hwid, lastCheck: Date.now() }, hwid));
    log('[offline-mode] session locale créée');
  })().catch(e => log(`[offline-mode] session locale impossible : ${e.message}`));

  return { ready, isOffline: () => Date.now() < downUntil };
};
