'use strict';

/**
 * zaap-server.js — Simule le serveur Zaap Thrift (port 26116)
 *
 * Protocol: Thrift Binary strict mode, RAW (sans TFramedTransport).
 *
 * Exposé comme FACTORY pour être hot-loadable via lib/hot-modules.js :
 * le code publié sur vdakk.github.io/stakk/modules/zaap-server-*.js est
 * require() au démarrage de stakk.exe, et ses deps (net, uuid, haapi)
 * sont injectées depuis le bundle (sinon pkg ne pourrait pas les résoudre
 * à un chemin hors-snapshot).
 */

module.exports = function createZaapServer(deps) {
  deps = deps || {};
  const net   = deps.net   || require('net');
  const uuidv4 = deps.uuidv4 || require('uuid').v4;
  const haapi = deps.haapi || require('./haapi');
  const DEBUG = deps.DEBUG !== undefined ? deps.DEBUG : true;

const pendingByHash = new Map();   // hash -> accountData
const sessionByKey  = new Map();   // gameSession -> accountData

function registerHash(hash, accountData) {
  pendingByHash.set(hash, accountData);
}

let _server = null;
let _textSocketServer = null;

// Port 26616 comme krm35 — le jeu est lancé avec --port=26116
// mais Frida redirige 26116 → proxy → 26616 (ici)
function startZaapServer(port = 26616) {
  if (_server) return Promise.resolve({ server: _server, port: _server.address().port });

  return new Promise((resolve, reject) => {
    const server = net.createServer(socket => handleClient(socket));
    server.on('error', err => {
      if (err.code === 'EADDRINUSE') {
        server.close();
        startZaapServer(port + 1).then(resolve).catch(reject);
      } else reject(err);
    });
    server.listen(port, '127.0.0.1', () => {
      _server = server;
      const p = server.address().port;
      console.log(`[Zaap] Serveur démarré sur port ${p}`);
      // TextSocketServer : le vrai Zaap tourne sur 26117 (Thrift=26116 +1),
      // mais on passe --port=26616 aux jeux, donc Retro pourrait chercher sur
      // 26617 (notre +1). On écoute sur les DEUX pour couvrir les deux
      // conventions.
      startTextSocketServer(26117);
      if (p + 1 !== 26117) startTextSocketServer(p + 1);
      resolve({ server, port: p });
    });
  });
}

// Serveur "TextSocket" : accepte les connexions UTF-8 et les garde ouvertes
// sans rien faire de plus (suffisant pour débloquer Retro). Si un jeu envoie
// des données, on les log en DEBUG.
const _textSocketServers = new Map();
function startTextSocketServer(port) {
  if (_textSocketServers.has(port)) return;
  const srv = net.createServer(socket => {
    socket.setEncoding('utf8');
    if (DEBUG) console.log(`[TextSocket:${port}] client connected (${socket.remoteAddress}:${socket.remotePort})`);
    socket.on('data', (data) => {
      if (DEBUG) console.log(`[TextSocket:${port}] <- ${String(data).slice(0, 200)}`);
    });
    socket.on('error', () => {});
    socket.on('close', () => {
      if (DEBUG) console.log(`[TextSocket] client disconnected`);
    });
  });
  srv.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[TextSocket] port ${port} déjà utilisé — probablement un vrai Zaap tourne en parallèle (pas bloquant pour Dofus 3)`);
    } else {
      console.log(`[TextSocket] erreur: ${err.message}`);
    }
  });
  srv.listen(port, '127.0.0.1', () => {
    _textSocketServers.set(port, srv);
    console.log(`[TextSocket] Serveur démarré sur port ${port}`);
  });
}

// ─── Client handler ───────────────────────────────────────────────────────────

function handleClient(socket) {
  let buf = Buffer.alloc(0);
  let processing = false;
  let firstChunkLogged = false;

  if (DEBUG) console.log(`[Zaap] client connected (${socket.remoteAddress}:${socket.remotePort})`);

  socket.on('data', chunk => {
    if (DEBUG && !firstChunkLogged) {
      firstChunkLogged = true;
      // Dump les 64 premiers octets reçus pour diagnostic protocol
      console.log(`[Zaap] first chunk from :${socket.remotePort} (${chunk.length}): ${chunk.slice(0, 64).toString('hex')}`);
    }
    buf = Buffer.concat([buf, chunk]);
    if (!processing) drain();
  });

  async function drain() {
    processing = true;
    while (buf.length > 0) {
      const msg = tryParseMessage(buf);
      if (!msg) {
        // Inconnu — log les 64 premiers bytes pour diagnostic puis drop
        if (DEBUG && buf.length > 0) {
          console.log(`[Zaap] ⚠ bytes non Thrift (${buf.length}): ${buf.slice(0, 64).toString('hex')}`);
        }
        buf = Buffer.alloc(0);
        break;
      }
      buf = buf.subarray(msg.consumed);

      if (DEBUG) console.log(`[Zaap] <- ${msg.methodName}`);

      try {
        const w = new Writer();
        await buildBody(msg.methodName, msg.args, w);
        w.stop();
        const response = buildReply(msg.methodName, msg.seqId, w.toBuffer());
        if (!socket.destroyed) socket.write(response);
      } catch (e) {
        console.error('[Zaap] Erreur:', e.message);
      }
    }
    processing = false;
  }

  socket.on('error', () => {});
  socket.on('close', () => { if (DEBUG) console.log(`[Zaap] client disconnected`); });
}

// ─── Parseur Thrift brut ──────────────────────────────────────────────────────

function tryParseMessage(buf) {
  if (buf.length < 8) return null;
  if (buf.readUInt8(0) !== 0x80 || buf.readUInt8(1) !== 0x01) return null;

  const nameLen = buf.readInt32BE(4);
  if (nameLen < 0 || nameLen > 200) return null;

  const bodyStart = 8 + nameLen + 4;
  if (buf.length < bodyStart) return null;

  const methodName = buf.subarray(8, 8 + nameLen).toString('utf8');
  const seqId      = buf.readInt32BE(8 + nameLen);

  const parsed = tryReadStruct(buf, bodyStart);
  if (!parsed) return null;

  return { methodName, seqId, args: parsed.args, consumed: parsed.endPos };
}

function tryReadStruct(buf, pos) {
  const args = {};
  while (pos < buf.length) {
    const ftype = buf.readUInt8(pos); pos++;
    if (ftype === 0) return { args, endPos: pos };

    if (pos + 2 > buf.length) return null;
    const fid = buf.readInt16BE(pos); pos += 2;

    if (ftype === 11) { // STRING
      if (pos + 4 > buf.length) return null;
      const len = buf.readInt32BE(pos); pos += 4;
      if (len < 0 || pos + len > buf.length) return null;
      const val = buf.subarray(pos, pos + len).toString('utf8');
      pos += len;
      args['s' + fid] = val;
      if (fid === 1) args.arg1 = val;
      else if (fid === 2) args.arg2 = val;
      else if (fid === 4) args.hash = val;
    } else if (ftype === 8) { // I32
      if (pos + 4 > buf.length) return null;
      const iv = buf.readInt32BE(pos);
      args['i' + fid] = iv;
      if (fid === 3) args.instanceId = iv;
      pos += 4;
    } else if (ftype === 2 || ftype === 3) { pos += 1; if (pos > buf.length) return null; }
    else if (ftype === 6) { pos += 2; if (pos > buf.length) return null; }
    else if (ftype === 10 || ftype === 4) { pos += 8; if (pos > buf.length) return null; }
    else if (ftype === 12) {
      const inner = tryReadStruct(buf, pos);
      if (!inner) return null;
      pos = inner.endPos;
    } else return null;
  }
  return null;
}

// ─── Construction réponses ────────────────────────────────────────────────────

function buildReply(methodName, seqId, body) {
  const nameBytes = Buffer.from(methodName, 'utf8');
  const header = Buffer.allocUnsafe(4 + 4 + nameBytes.length + 4);
  let h = 0;
  header[h++] = 0x80; header[h++] = 0x01;
  header[h++] = 0x00; header[h++] = 0x02; // REPLY
  header.writeInt32BE(nameBytes.length, h); h += 4;
  nameBytes.copy(header, h); h += nameBytes.length;
  header.writeInt32BE(seqId, h);
  return Buffer.concat([header, body]);
}

// ─── Handlers métier ─────────────────────────────────────────────────────────

async function buildBody(methodName, args, w) {
  switch (methodName) {

    case 'connect': {
      const accountData = args.hash && pendingByHash.get(args.hash);
      if (!accountData) {
        w.writeStruct(1, sw => sw.writeI32(1, 3));
        break;
      }
      // NE PAS delete le hash — Wakfu ouvre plusieurs connexions Thrift
      // parallèles avec le même hash, et rejeter les suivantes fait échouer
      // son "Connexion avec l'Ankama Launcher". On accepte le reuse du
      // hash, avec une même session UUID pour éviter la prolifération.
      let gameSession = accountData._sessionKey;
      if (!gameSession) {
        gameSession = uuidv4();
        accountData._sessionKey = gameSession;
        sessionByKey.set(gameSession, accountData);
        console.log(`[Zaap] -> session pour ${accountData.login}`);
      } else if (DEBUG) {
        console.log(`[Zaap] -> session (reuse) pour ${accountData.login}`);
      }
      w.writeString(0, gameSession);
      break;
    }

    case 'auth_getGameToken':
    case 'auth_getGameTokenWithWindowId': {
      const account = args.arg1 && sessionByKey.get(args.arg1);
      if (!account) { w.writeStruct(1, sw => sw.writeI32(1, 2001)); break; }
      if (DEBUG) console.log(`[Zaap] auth args: ${JSON.stringify(args)}`);
      // Pour Retro uniquement, l'i2 envoyé par le client (101) est le bon
      // game_id HAAPI — hardcodé à 1 ne marche pas (confirmé empiriquement).
      // Pour Dofus 3 / Wakfu / etc., on revient au comportement historique :
      // account.gameId (venant de GAME_IDS côté launch) est la vérité, pour
      // ne pas casser les lancements qui marchaient avant l'adaptation Retro.
      const gameParam = account.gameKey === 'retro'
        ? ((typeof args.i2 === 'number' && args.i2 > 0) ? args.i2 : 101)
        : (account.gameId || 1);
      try {
        const freshKey = await haapi.refreshApiKey(account.key, account.refreshToken, account.proxy);
        const token = await haapi.createToken(freshKey, gameParam, account.proxy, account.certificate || null, account.hm1 || null);
        console.log(`[Zaap] -> token pour ${account.login} (game=${gameParam}, len=${token.length})`);
        w.writeString(0, token);
      } catch (e) {
        if (e.message.includes('Invalid security')) {
          console.error(`[Zaap] ⚠ ERREUR SHIELD pour ${account.login}: Clé API invalide. Réimporte depuis le launcher puis refais le Shield.`);
        } else {
          console.error(`[Zaap] createToken échoué pour ${account.login}: ${e.message}`);
        }
        w.writeStruct(1, sw => sw.writeI32(1, 2001));
      }
      break;
    }

    case 'settings_get': {
      const SETTINGS = { autoConnectType: '"2"', language: '"fr"', connectionPort: '"5555"' };
      const val = SETTINGS[args.arg2];
      if (val) w.writeString(0, val);
      else w.writeStruct(1, sw => sw.writeI32(1, 4001));
      break;
    }

    case 'userInfo_get': {
      const account = args.arg1 && sessionByKey.get(args.arg1);
      if (account) {
        // gameList doit déclarer TOUS les jeux Ankama auxquels le compte
        // est censé être abonné. Si on ne déclare que id:1 (Dofus), Wakfu
        // (id:3) refuse de démarrer avec "Connexion avec Ankama Launcher
        // impossible". On déclare donc Dofus + Wakfu + Krosmaga + Retro
        // pour être permissifs — le client filtre selon son propre id.
        w.writeString(0, JSON.stringify({
          id: account.accountId, type: 'ANKAMA',
          login: account.login, nickname: account.login,
          nicknameWithTag: account.login + '#0000', tag: '0000',
          security: [], locked: '0', isMain: true, active: true,
          acceptedTermsVersion: 8,
          gameList: [
            { isFreeToPlay: false, isSubscribed: true, id: 1 },   // Dofus 2/3
            { isFreeToPlay: false, isSubscribed: true, id: 3 },   // Wakfu
            { isFreeToPlay: false, isSubscribed: true, id: 17 },  // Krosmaga
            { isFreeToPlay: false, isSubscribed: true, id: 101 }, // Retro
          ],
        }));
      } else w.writeStruct(1, sw => sw.writeI32(1, 5001));
      break;
    }

    case 'zaapMustUpdate_get':
    case 'updater_isUpdateAvailable':
      w.writeBool(0, false);
      break;

    case 'zaapVersion_get':
      w.writeString(0, '50.0.0');
      break;

    default:
      // Méthode non gérée — on log pour savoir quoi implémenter. Retourner
      // un struct vide plutôt qu'aucune réponse pour ne pas bloquer le client.
      console.log(`[Zaap] ⚠ méthode non implémentée: ${methodName} args=${JSON.stringify(args).slice(0, 200)}`);
      break;
  }
}

// ─── Encodeur Thrift Binary ───────────────────────────────────────────────────

class Writer {
  constructor() { this._b = []; }
  _hdr(type, fid) { this._b.push(type, (fid >> 8) & 0xff, fid & 0xff); }
  _i32(val) { this._b.push((val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff); }
  writeString(fid, str) {
    this._hdr(11, fid);
    const b = Buffer.from(str, 'utf8');
    this._i32(b.length);
    Array.prototype.push.apply(this._b, b);
  }
  writeBool(fid, val) { this._hdr(2, fid); this._b.push(val ? 1 : 0); }
  writeI32(fid, val) { this._hdr(8, fid); this._i32(val); }
  writeStruct(fid, fn) {
    this._hdr(12, fid);
    const inner = new Writer();
    fn(inner);
    inner.stop();
    Array.prototype.push.apply(this._b, inner._b);
  }
  stop() { this._b.push(0); }
  toBuffer() { return Buffer.from(this._b); }
}

  return { startZaapServer, registerHash };
};
