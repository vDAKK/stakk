#!/bin/bash
# STAKK — universal auto-updater (macOS)
# Hosted at https://vdakk.github.io/stakk/update.sh
#
# Le client télécharge ce fichier puis le lance via bash. Les bugs d'updater
# peuvent être corrigés sans rebuild du client — il suffit de mettre à jour
# ce fichier sur GitHub Pages.
#
# Contrat :
#   - update.sh est placé dans le dossier de stakk
#   - update.zip aussi (déjà téléchargé par le client)
#   - Aucun argument — le script se repère seul via son propre path
set +e

APPDIR="$(cd "$(dirname "$0")" && pwd)"
LOG="$APPDIR/update.log"
ZIP="$APPDIR/update.zip"
TMPDIR="$APPDIR/update-tmp"
EXE="$APPDIR/stakk"
BACKUP="$APPDIR/stakk.old"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"; }

echo "=== Update start (external v1) ===" > "$LOG"
log "APPDIR: $APPDIR"

# 1) Kill running stakk + wait
log "Killing stakk..."
pkill -f "$APPDIR/stakk" 2>/dev/null
sleep 3

# 2) Backup via rename
[ -f "$BACKUP" ] && rm -f "$BACKUP"
if [ -f "$EXE" ]; then
  log "Renaming $EXE -> $BACKUP"
  mv -f "$EXE" "$BACKUP"
fi

# 3) Extract
if [ ! -f "$ZIP" ]; then
  log "!! update.zip missing"
  osascript -e 'display alert "STAKK" message "Mise à jour: update.zip introuvable."' 2>/dev/null
  exit 1
fi
[ -d "$TMPDIR" ] && rm -rf "$TMPDIR"
log "Extracting..."
unzip -o "$ZIP" -d "$TMPDIR" >> "$LOG" 2>&1

# 4) Copy
log "Copying..."
cp -Rf "$TMPDIR/"* "$APPDIR/" >> "$LOG" 2>&1
chmod +x "$EXE" 2>/dev/null

# 5) Validate new exe (size > 10 MB)
VALID=0
if [ -f "$EXE" ]; then
  SIZE=$(wc -c < "$EXE" | tr -d ' ')
  log "New exe size: $SIZE"
  if [ "$SIZE" -gt 10000000 ]; then VALID=1; fi
fi
if [ "$VALID" != "1" ]; then
  log "!! New exe invalid, rolling back"
  rm -f "$EXE"
  [ -f "$BACKUP" ] && mv "$BACKUP" "$EXE"
  osascript -e 'display alert "STAKK" message "Mise à jour impossible (exe invalide). Version précédente restaurée."' 2>/dev/null
  exit 1
fi

rm -rf "$TMPDIR"
rm -f "$ZIP"

# 6) Relaunch
log "Relaunching..."
cd "$APPDIR"
nohup "$EXE" > /dev/null 2>&1 &
sleep 3

# 7) Retry once if not running
if ! pgrep -f "$APPDIR/stakk" > /dev/null; then
  log "!! not running, retry"
  nohup "$EXE" > /dev/null 2>&1 &
  sleep 3
fi

# 8) Rollback if still not running
if ! pgrep -f "$APPDIR/stakk" > /dev/null; then
  log "!! RELAUNCH FAILED, rolling back"
  if [ -f "$BACKUP" ]; then
    rm -f "$EXE"
    mv "$BACKUP" "$EXE"
    nohup "$EXE" > /dev/null 2>&1 &
    osascript -e 'display alert "STAKK" message "La mise à jour a échoué. Version précédente restaurée."' 2>/dev/null
  else
    osascript -e 'display alert "STAKK" message "La mise à jour a échoué. Retélécharge depuis github.com/vDAKK/stakk/releases."' 2>/dev/null
  fi
  log "Done (rollback)"
  exit 1
fi

# 9) Cleanup backup
[ -f "$BACKUP" ] && rm -f "$BACKUP"
log "Done (success)"
rm -- "$0"
