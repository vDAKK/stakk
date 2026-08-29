'use strict';

/**
 * chasse-main.js — l'overlay de chasse au trésor, un sidecar à lui seul.
 *
 * Il ne partage rien avec l'overlay des ressources : ni fenêtre, ni position,
 * ni interrupteur, ni processus. Activer la chasse n'affiche jamais la grille
 * des ressources, et l'inverse est vrai aussi.
 *
 * Ce qu'il fait, à chaque tour : demander l'état de la chasse à STAKK, écrire
 * `/travel x,y` dans le presse-papiers quand la cible change, et pousser
 * l'état dans la page.
 *
 * ═══ Pourquoi le presse-papiers est écrit ICI ════════════════════════════
 *
 * Pas dans le rendu : la fenêtre est `focusable: false` — sans quoi elle
 * volerait le focus au jeu à chaque clic — et `navigator.clipboard` exige le
 * focus du document. Le processus principal, lui, n'en a pas besoin.
 *
 * ═══ Les raccourcis ══════════════════════════════════════════════════════
 *
 * `globalShortcut` est global au SYSTÈME, pas au processus : si l'overlay des
 * ressources a déjà pris Ctrl+Shift+O et Ctrl+Shift+Q, les réenregistrer ici
 * échoue en silence, et le raccourci ne marche que pour l'un des deux. D'où
 * un jeu distinct.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Le fichier n'est PAS vidé ici : le bootstrap l'a déjà fait, et l'effacer
// une seconde fois emporterait sa trace — c'est-à-dire précisément ce qu'on
// veut lire quand le chargement échoue avant d'arriver jusqu'ici.
const DEBUG_LOG = path.join(os.tmpdir(), 'stakk-chasse-debug.log');
function dbg(msg) {
  try { fs.appendFileSync(DEBUG_LOG, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
}
dbg(`STARTUP argv=${JSON.stringify(process.argv)}`);

const electron = require('electron');
const { app, BrowserWindow, globalShortcut, clipboard } = electron;
if (!app) { dbg('FATAL: app undefined'); process.exit(3); }

const STAKK_URL = process.argv[2] || 'http://127.0.0.1:3000';
const BOUNDS_FILE = process.env.STAKK_CHASSE_BOUNDS
  || path.join(os.homedir(), '.stakk', 'overlay', 'chasse-bounds.json');

// Assez large pour « 12 cartes [7,9] » et un nom d'indice, assez court pour ne
// rien masquer du jeu.
const DEFAUT = { x: 40, y: 40, width: 260, height: 96 };

let win = null;
let editMode = false;

function chargerBounds() {
  try {
    const b = JSON.parse(fs.readFileSync(BOUNDS_FILE, 'utf8'));
    if (typeof b.x === 'number' && typeof b.y === 'number'
      && typeof b.width === 'number' && typeof b.height === 'number'
      && b.width >= 120 && b.height >= 50) return b;
  } catch {}
  return null;
}
let sauveTimer = null;
function sauverBounds() {
  if (!win) return;
  clearTimeout(sauveTimer);
  sauveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(BOUNDS_FILE), { recursive: true });
      fs.writeFileSync(BOUNDS_FILE, JSON.stringify(win.getBounds()));
    } catch {}
  }, 500);
}

function creerFenetre() {
  win = new BrowserWindow({
    ...(chargerBounds() || DEFAUT),
    transparent: true,
    frame: false,
    resizable: true,
    movable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    // Sans ça, la fenêtre prendrait le focus au clic et le jeu le perdrait.
    focusable: false,
    title: 'STAKK Chasse',
    webPreferences: { contextIsolation: true, nodeIntegration: false, webSecurity: false },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });

  // Servi par STAKK en loopback : même origine que /api/*, donc ni CORS ni
  // mixed-content, et le fichier reste chargeable à chaud.
  const url = `${STAKK_URL}/overlay/chasse.html?t=${Date.now()}`;
  dbg(`loadURL ${url}`);
  win.loadURL(url).then(() => dbg('loadURL OK')).catch(e => dbg(`loadURL ERR: ${e.message}`));
  win.on('move', sauverBounds);
  win.on('resize', sauverBounds);
  win.on('closed', () => { win = null; });
}

function basculerEdition() {
  editMode = !editMode;
  if (!win) return;
  win.setIgnoreMouseEvents(!editMode, { forward: true });
  pousser(`window.__edit = ${editMode}; window.dispatchEvent(new CustomEvent("edit-mode"));`);
}

// ─── Le sondage ────────────────────────────────────────────────────────────

const SONDAGE_MS = 1500;
let dernierTravel = null;   // ce qu'on a déjà copié, pour ne pas le recopier
let copieActive = true;     // cache entre deux tours ; le serveur fait foi

// STAKK verrouille /api/* sur l'origine : une requête sans en-tête `Origin`
// est refusée (« Origin not allowed »). L'overlay des ressources n'a pas le
// problème — il sonde depuis le RENDU, dont l'origine est posée par Chromium.
// Ici les appels partent du processus principal, en http.get : c'est à nous de
// la déclarer. Sans elle, toutes les réponses sont des erreurs et la fenêtre
// reste vide sans jamais dire pourquoi.
const ENTETES = { Origin: STAKK_URL };

function sonder(chemin) {
  return new Promise((resolve) => {
    try {
      const http = require('http');
      const req = http.get(`${STAKK_URL}${chemin}`, { headers: ENTETES }, (res) => {
        let corps = '';
        res.setEncoding('utf8');
        res.on('data', c => { corps += c; });
        res.on('end', () => { try { resolve(JSON.parse(corps)); } catch { resolve(null); } });
      });
      req.setTimeout(2000, () => { req.destroy(); resolve(null); });
      req.on('error', () => resolve(null));
    } catch { resolve(null); }
  });
}

function poster(chemin, corps) {
  return new Promise((resolve) => {
    try {
      const http = require('http');
      const donnees = Buffer.from(JSON.stringify(corps), 'utf8');
      const u = new URL(`${STAKK_URL}${chemin}`);
      const req = http.request({
        hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': donnees.length,
          ...ENTETES,
        },
      }, (res) => { res.resume(); res.on('end', () => resolve(true)); });
      req.setTimeout(2000, () => { req.destroy(); resolve(false); });
      req.on('error', () => resolve(false));
      req.end(donnees);
    } catch { resolve(false); }
  });
}

function pousser(script) {
  if (!win) return Promise.resolve();
  return win.webContents.executeJavaScript(script).catch(e => dbg(`push KO: ${e.message}`));
}

function afficher(etat) {
  return pousser(`window.__chasse = ${JSON.stringify(etat)};`
    + 'window.dispatchEvent(new CustomEvent("chasse"));');
}

/**
 * Le compte suivi : le premier de `/api/map-state`.
 *
 * Exactement la règle de l'overlay des ressources, qui fait
 * `Object.entries(state)[0]`. Deux overlays posés sur le même jeu doivent
 * suivre le même personnage, sinon ils se contredisent à l'écran.
 *
 * Les comptes sont À LA RACINE de la réponse :
 *
 *     {"71760068":{"mapId":191104002,"updatedAt":...,"running":true}}
 *
 * Ce code cherchait une clé `accounts` qui n'a jamais existé : la liste était
 * donc toujours vide, et la fenêtre affichait « aucun compte lancé » alors
 * qu'un personnage était bien en jeu.
 *
 * Relu à chaque tour, jamais mémorisé : un compte fermé puis rouvert, ou
 * remplacé par un autre, doit être suivi sans redémarrer l'overlay.
 */
function compteDe(maps) {
  if (!maps || typeof maps !== 'object') return null;
  const ids = Object.keys(maps);
  if (!ids.length) return null;
  const id = Number(ids[0]);
  return Number.isFinite(id) ? id : null;
}

async function tour() {
  if (!win) return;

  const compte = compteDe(await sonder('/api/map-state'));
  if (compte === null) {
    // Le dire, plutôt que d'afficher une fenêtre vide sans raison.
    await afficher({ compte: false });
    return;
  }

  const statut = await sonder('/api/overlay/status');
  if (statut && typeof statut.chasseCopie === 'boolean') copieActive = statut.chasseCopie;

  const etat = await sonder(`/api/chasse/etat?accountId=${compte}`);
  if (!etat || etat.error) return;

  // Une seule copie par cible : écraser le presse-papiers toutes les 1,5 s
  // rendrait la machine inutilisable pour tout le reste.
  if (copieActive && etat.travel && etat.travel !== dernierTravel) {
    try {
      clipboard.writeText(etat.travel);
      dernierTravel = etat.travel;
      dbg(`clipboard: ${etat.travel}`);
    } catch (e) { dbg(`clipboard KO: ${e.message}`); }
  }
  // Plus de cible : on réarme, pour que le retour de la MÊME cible se recopie.
  if (!etat.travel) dernierTravel = null;

  await afficher({ ...etat, copie: copieActive });
}

app.whenReady().then(() => {
  try {
    const { session } = electron;
    session.defaultSession.clearCache();
  } catch (e) { dbg(`cache clear KO: ${e.message}`); }

  try { creerFenetre(); }
  catch (e) { dbg(`creerFenetre a leve: ${e.stack || e.message}`); }

  // Jeu distinct de celui de l'overlay des ressources (O/F/↑/↓/Q) : un
  // accélérateur déjà pris par l'autre processus échouerait sans rien dire.
  try {
    globalShortcut.register('CommandOrControl+Shift+H', basculerEdition);
    globalShortcut.register('CommandOrControl+Shift+C', () => {
      const voulu = !copieActive;
      copieActive = voulu;      // effet immédiat, confirmé au tour suivant
      dernierTravel = null;     // réarme : la prochaine cible sera copiée
      dbg(`copie /travel ${voulu ? 'ON' : 'OFF'}`);
      poster('/api/overlay/chasse-copie', { actif: voulu })
        .then(ok => { if (!ok) dbg('copie : POST refuse, le serveur garde son etat'); });
    });
    dbg('raccourcis enregistres');
  } catch (e) { dbg(`raccourcis KO: ${e.message}`); }

  setInterval(() => { tour().catch(e => dbg(`tour: ${e.message}`)); }, SONDAGE_MS);
}).catch(e => dbg(`whenReady rejete: ${e.message}`));

app.on('will-quit', () => { try { globalShortcut.unregisterAll(); } catch {} });
app.on('window-all-closed', () => app.quit());
dbg('fin de chasse-main.js');
