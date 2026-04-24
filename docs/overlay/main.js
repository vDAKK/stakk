'use strict';
console.log('[STAKK overlay] main.js loaded');

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEBUG_LOG = path.join(os.tmpdir(), 'stakk-overlay-debug.log');
try { fs.unlinkSync(DEBUG_LOG); } catch {}
function dbg(msg) {
  try { fs.appendFileSync(DEBUG_LOG, `[${new Date().toISOString()}] ${msg}\n`); }
  catch (e) { console.log('[STAKK overlay] dbg fail:', e.message); }
}
dbg(`STARTUP argv=${JSON.stringify(process.argv)}`);
console.log('[STAKK overlay] dbg called, log path:', DEBUG_LOG);

const electron = require('electron');
console.log('[STAKK overlay] electron required, type:', typeof electron, 'has app:', !!electron.app);
dbg(`electron loaded: type=${typeof electron} hasApp=${!!electron.app}`);

const { app, BrowserWindow, globalShortcut, ipcMain } = electron;
if (!app) {
  console.log('[STAKK overlay] FATAL: app is undefined');
  dbg('FATAL: app undefined');
  process.exit(3);
}

// argv[2] = stakkUrl. BOUNDS_FILE passé via env var car Electron 33+ interprète
// les args extra comme des entry scripts supplémentaires et silently exit si
// le 2e arg n'est pas un .js valide.
const STAKK_URL = process.argv[2] || 'http://127.0.0.1:3000';
const BOUNDS_FILE = process.env.STAKK_OVERLAY_BOUNDS || path.join(app.getPath('userData'), 'overlay-bounds.json');
console.log('[STAKK overlay] STAKK_URL=' + STAKK_URL + ' BOUNDS_FILE=' + BOUNDS_FILE);
dbg(`vars resolved`);

// disableHardwareAcceleration() vit dans bootstrap.js (doit être appelé
// AVANT app-ready, qui peut déjà avoir fired quand main.js est require
// après un fetch async hot-update). Ici on ne l'appelle plus.

let win = null;
let editMode = false;

// Stocke aussi le radius (zoom de la grille) dans le même fichier que les
// bounds pour avoir une seule source de truth de l'état overlay.
let currentRadius = 1; // chargé depuis bounds, mutable via hotkeys

function loadBounds() {
  try {
    const b = JSON.parse(fs.readFileSync(BOUNDS_FILE, 'utf8'));
    if (typeof b.radius === 'number' && b.radius >= 1 && b.radius <= 3) {
      currentRadius = b.radius;
    }
    if (typeof b.x === 'number' && typeof b.y === 'number' &&
        typeof b.width === 'number' && typeof b.height === 'number' &&
        b.width >= 100 && b.height >= 100) return b;
  } catch {}
  return null;
}
let saveTimer = null;
function saveBoundsDebounced() {
  if (!win) return;
  // En plan-mode les bounds window sont temporaires (grande fenêtre de
  // planification) ; on ne les persiste pas, sinon au prochain launch
  // l'overlay s'ouvrirait en taille planner alors qu'il doit être compact.
  if (planMode) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(BOUNDS_FILE), { recursive: true });
      fs.writeFileSync(BOUNDS_FILE,
        JSON.stringify({ ...win.getBounds(), radius: currentRadius }));
    } catch {}
  }, 500);
}

// Plan mode : fenêtre agrandie temporairement quand l'utilisateur bascule
// en vue étendue (big-map) pour pouvoir créer un trajet à l'aise. On sauve
// les bounds compactes avant d'agrandir, on restaure à la sortie.
let planMode = false;
let savedCompactBounds = null;
function applyPlanMode(on) {
  if (!win) return;
  if (on && !planMode) {
    planMode = true;
    savedCompactBounds = win.getBounds();
    try {
      const { screen } = require('electron');
      const wa = screen.getPrimaryDisplay().workArea;
      const w = Math.min(1200, Math.max(600, Math.round(wa.width  * 0.7)));
      const h = Math.min(1200, Math.max(600, Math.round(wa.height * 0.8)));
      // Garde le centre de la fenêtre à la même position pour que l'user
      // "voie" la fenêtre grandir autour de sa position actuelle. Contraint
      // au workArea pour ne pas disparaître hors écran.
      const cx = savedCompactBounds.x + savedCompactBounds.width  / 2;
      const cy = savedCompactBounds.y + savedCompactBounds.height / 2;
      let x = Math.round(cx - w / 2);
      let y = Math.round(cy - h / 2);
      x = Math.max(wa.x, Math.min(wa.x + wa.width  - w, x));
      y = Math.max(wa.y, Math.min(wa.y + wa.height - h, y));
      win.setBounds({ x, y, width: w, height: h });
    } catch (e) { dbg(`applyPlanMode grow err: ${e.message}`); }
  } else if (!on && planMode) {
    planMode = false;
    if (savedCompactBounds) {
      try { win.setBounds(savedCompactBounds); } catch {}
      savedCompactBounds = null;
    }
  }
}

function setRadius(r) {
  currentRadius = Math.max(1, Math.min(3, r));
  if (win) win.webContents.send('set-radius', currentRadius);
  saveBoundsDebounced();
}

// Auto-hide retiré — overlay toujours visible, l'utilisateur quitte avec
// Ctrl+Shift+Q quand il veut. Simple et fiable.

function createWindow() {
  dbg('createWindow start');
  const saved = loadBounds() || { x: 100, y: 100, width: 280, height: 280 };
  win = new BrowserWindow({
    ...saved,
    transparent: true,
    frame: false,
    resizable: true,
    movable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    focusable: false,
    title: 'STAKK Overlay',
    webPreferences: {
      // preload.js est bundlé avec stakk.exe. Quand main.js est hot-chargé
      // depuis ~/.stakk/overlay/, __dirname pointe là — or preload n'y est
      // pas. Le bootstrap expose le dir bundlé via env var.
      preload: path.join(process.env.STAKK_OVERLAY_BUNDLED_DIR || __dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });
  dbg('BrowserWindow created');
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });
  // window.open depuis le renderer (bouton 📋 planner) → ouvre dans le
  // navigateur OS par défaut au lieu de créer une 2e BrowserWindow Electron
  // (qui hériterait de la transparence/click-through, complètement cassé pour
  // une page d'édition normale). shell.openExternal respecte le browser
  // default de l'user. 'deny' indique à Chromium de ne PAS spawn de window.
  try {
    const { shell } = require('electron');
    win.webContents.setWindowOpenHandler(({ url }) => {
      try { shell.openExternal(url); } catch (e) { dbg(`openExternal err: ${e.message}`); }
      return { action: 'deny' };
    });
  } catch (e) { dbg(`setWindowOpenHandler err: ${e.message}`); }
  // Charge le renderer depuis STAKK local (loopback HTTP). web-server.js
  // proxy-fetch les assets depuis GitHub Pages (hot-updatable sans rebuild),
  // donc même origine que l'API — pas de CORS ni mixed-content à gérer.
  // Cache-busting via timestamp pour éviter que Chromium garde l'ancienne version.
  const url = `${STAKK_URL}/overlay/?stakkUrl=${encodeURIComponent(STAKK_URL)}&t=${Date.now()}`;
  dbg(`loadURL ${url}`);
  win.loadURL(url).then(() => dbg('loadURL OK')).catch(e => dbg(`loadURL ERR: ${e.message}`));
  win.on('move',   saveBoundsDebounced);
  win.on('resize', saveBoundsDebounced);
  win.on('closed', () => { dbg('window closed'); win = null; });

  // Une fois la page chargée, envoyer le radius initial au renderer
  win.webContents.on('did-finish-load', () => {
    try { win.webContents.send('set-radius', currentRadius); } catch {}
  });

  // Auto click-through : le renderer signale via document.title quand la
  // souris est DANS l'overlay (title contient 'click') ou dessus sans y
  // être (title contient 'idle'). Ça permet aux cellules de recevoir des
  // clicks sans avoir à rebuild preload.js (astuce page-title-updated,
  // fonctionne avec forward:true qui pousse les mouseenter/leave au renderer).
  win.webContents.on('page-title-updated', (_e, title) => {
    if (!win) return;
    const t = typeof title === 'string' ? title : '';
    const wantsClick = t.includes('click');
    const wantsPlan  = t.includes('plan');
    win.setIgnoreMouseEvents(!editMode && !filterMode && !wantsClick, { forward: true });
    applyPlanMode(wantsPlan);
  });
}

function toggleEditMode() {
  editMode = !editMode;
  if (!win) return;
  win.setIgnoreMouseEvents(!editMode && !filterMode, { forward: true });
  win.webContents.send('edit-mode', editMode);
}

let filterMode = false;
function toggleFilterMode() {
  filterMode = !filterMode;
  if (!win) return;
  // Click-through désactivé tant qu'on est en édit OU filtre
  win.setIgnoreMouseEvents(!editMode && !filterMode, { forward: true });
  win.webContents.send('filter-mode', filterMode);
}

dbg('registering whenReady');
app.whenReady().then(() => {
  dbg('whenReady fired');
  // Disable HTTP cache — le renderer est servi depuis GH Pages et doit être
  // rechargé frais à chaque spawn pour que les hot updates s'appliquent.
  // Sans ça, Chromium cache index.html et on garde l'ancienne version.
  try {
    const { session } = require('electron');
    session.defaultSession.clearCache();
    session.defaultSession.clearStorageData({ storages: ['shadercache', 'cachestorage'] });
  } catch (e) { dbg(`cache clear failed: ${e.message}`); }
  try { createWindow(); }
  catch (e) { dbg(`createWindow threw: ${e.stack || e.message}`); }
  try {
    globalShortcut.register('CommandOrControl+Shift+O', toggleEditMode);
    globalShortcut.register('CommandOrControl+Shift+F', toggleFilterMode);
    globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit());
    // Zoom out / in. Radius 1=3x3, 2=5x5, 3=7x7.
    globalShortcut.register('CommandOrControl+Shift+Up',   () => setRadius(currentRadius + 1));
    globalShortcut.register('CommandOrControl+Shift+Down', () => setRadius(currentRadius - 1));
    dbg('shortcuts registered');
  } catch (e) { dbg(`shortcuts FAILED: ${e.message}`); }
}).catch(e => dbg(`whenReady REJECTED: ${e.message}`));

app.on('will-quit', () => {
  dbg('will-quit');
  try { globalShortcut.unregisterAll(); } catch {}
});
app.on('window-all-closed', () => { dbg('window-all-closed'); app.quit(); });

ipcMain.on('toggle-edit', toggleEditMode);

dbg('end of main.js');
