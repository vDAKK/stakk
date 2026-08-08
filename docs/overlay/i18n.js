/* STAKK — i18n partagé de l'overlay et du planner de trajet.
 *
 * L'UI principale tourne sur GitHub Pages et l'overlay/planner sur
 * http://127.0.0.1:3000 : les deux origines ont des localStorage SÉPARÉS, donc
 * la langue choisie dans STAKK ne peut pas être lue directement ici. Elle est
 * stockée côté stakk.exe (plugin overlay-backend, ~/.stakk/overlay-lang.json)
 * et exposée par GET/POST /api/overlay/lang. `sync()` la récupère, la met en
 * cache dans le localStorage local (pour l'affichage instantané au prochain
 * chargement) et prévient la page quand elle change.
 *
 * Terminologie : les termes de jeu (trajet, étape, map, ressource) suivent le
 * vocabulaire officiel du client Dofus dans chaque langue.
 */
(function () {
  'use strict';

  var LANGS = ['fr', 'en', 'es', 'de', 'pt'];
  var STORE_KEY = 'stakk-overlay-lang';

  var L = {
    fr: {
      // Overlay
      routePlaceholder: '— trajet —',
      routeSelTitle: 'Charger un trajet enregistré',
      bigMapOn: 'Vue étendue (scroll + glisser)',
      bigMapOff: 'Vue normale',
      openPlanner: 'Ouvrir le planner de trajet dans le navigateur',
      openPlannerShort: 'Ouvrir le planner',
      statusBar: 'glisse pour positionner · Ctrl+Shift+F filtres · Ctrl+Shift+↑/↓ zoom · Ctrl+Shift+O sortir du mode édition · Ctrl+Shift+Q quitter',
      filtersLabel: 'Filtres :',
      hidden: 'masqué',
      routeLoaded: 'Trajet « {name} » chargé',
      routeDisabled: 'Trajet désactivé',
      start: 'Départ',
      arrived: 'Arrivé',
      cell: 'case',
      cells: 'cases',
      total: 'au total',
      copied: 'Copié',
      copyFailed: 'Copie échouée',
      noAccountRunning: 'aucun compte lancé',
      moveToDetect: '{n} compte(s) lancé(s), bouge sur la map pour détecter ta position',
      httpForMapGrid: 'HTTP {code} pour map-grid {mapId}',
      fetchErrMapGrid: 'ERREUR FETCH map-grid : {msg}',
      mapStateErr: 'ERREUR map-state : {msg}',
      // Planner
      plannerTitle: 'Planner de trajet',
      routeNamePlaceholder: 'Nom du trajet',
      saveRouteTitle: 'Enregistrer le trajet sous ce nom',
      save: 'Enregistrer',
      loadRoutePlaceholder: '— charger un trajet —',
      deleteRouteTitle: 'Supprimer le trajet courant',
      delete: 'Supprimer',
      clearTitle: 'Retirer toutes les étapes',
      clear: 'Vider',
      recenterTitle: 'Recentrer sur ma position courante',
      recenter: 'Recentrer',
      followTitle: 'Re-centre automatiquement quand tu changes de map',
      follow: 'Suivre',
      radiusDecTitle: 'Réduire le rayon',
      radiusIncTitle: 'Agrandir le rayon',
      steps: 'étape(s)',
      helpClick: 'ajouter/retirer une étape',
      helpDrag: 'déplacer la carte',
      helpRadius: 'agrandir le rayon',
      pickResources: 'Sélectionne les ressources à afficher :',
      shownResources: 'Ressources affichées :',
      selectAll: 'Tout sélectionner',
      deselectAll: 'Tout désélectionner',
      noCurrentMap: 'Aucune map courante — joue en jeu pour que STAKK la détecte.',
      cellsWithResources: '{n} cases avec ressources chargées — choisis un filtre ci-dessus',
      cellsShown: '{n} case(s) affichée(s) sur {total} contenant des ressources',
      nameTheRoute: 'Donne un nom au trajet',
      addOneStep: 'Ajoute au moins une étape',
      serverErrSave: 'Erreur serveur — trajet non enregistré',
      routeSaved: '« {name} » enregistré ({n} étapes)',
      routeLoadedShort: '« {name} » chargé',
      noRouteToDelete: 'Aucun trajet à supprimer',
      confirmDeleteRoute: 'Supprimer le trajet "{name}" ?',
      serverErrDelete: 'Erreur serveur — suppression échouée',
      routeDeleted: '« {name} » supprimé',
      noPlayerPos: 'Pas de position joueur détectée',
      noMapHere: 'Aucune map à ces coordonnées (falaise/mer) — choisis une autre case',
      migrating: 'Migration : {n} trajet(s) vers le serveur…',
      launchGameHint: 'Lance le jeu pour que STAKK détecte ta position, puis rafraîchis la page.',
    },
    en: {
      routePlaceholder: '— route —',
      routeSelTitle: 'Load a saved route',
      bigMapOn: 'Expanded view (scroll + drag)',
      bigMapOff: 'Normal view',
      openPlanner: 'Open the route planner in the browser',
      openPlannerShort: 'Open the planner',
      statusBar: 'drag to position · Ctrl+Shift+F filters · Ctrl+Shift+↑/↓ zoom · Ctrl+Shift+O leave edit mode · Ctrl+Shift+Q quit',
      filtersLabel: 'Filters:',
      hidden: 'hidden',
      routeLoaded: 'Route “{name}” loaded',
      routeDisabled: 'Route disabled',
      start: 'Start',
      arrived: 'Arrived',
      cell: 'map',
      cells: 'maps',
      total: 'in total',
      copied: 'Copied',
      copyFailed: 'Copy failed',
      noAccountRunning: 'no account running',
      moveToDetect: '{n} account(s) running, move on the map so your position can be detected',
      httpForMapGrid: 'HTTP {code} for map-grid {mapId}',
      fetchErrMapGrid: 'FETCH ERROR map-grid: {msg}',
      mapStateErr: 'map-state ERROR: {msg}',
      plannerTitle: 'Route planner',
      routeNamePlaceholder: 'Route name',
      saveRouteTitle: 'Save the route under this name',
      save: 'Save',
      loadRoutePlaceholder: '— load a route —',
      deleteRouteTitle: 'Delete the current route',
      delete: 'Delete',
      clearTitle: 'Remove every step',
      clear: 'Clear',
      recenterTitle: 'Recentre on my current position',
      recenter: 'Recentre',
      followTitle: 'Automatically recentre when you change map',
      follow: 'Follow',
      radiusDecTitle: 'Reduce the radius',
      radiusIncTitle: 'Increase the radius',
      steps: 'step(s)',
      helpClick: 'add/remove a step',
      helpDrag: 'move the map',
      helpRadius: 'increase the radius',
      pickResources: 'Select the resources to display:',
      shownResources: 'Displayed resources:',
      selectAll: 'Select all',
      deselectAll: 'Deselect all',
      noCurrentMap: 'No current map — play in game so STAKK can detect it.',
      cellsWithResources: '{n} maps with resources loaded — pick a filter above',
      cellsShown: '{n} map(s) shown out of {total} containing resources',
      nameTheRoute: 'Give the route a name',
      addOneStep: 'Add at least one step',
      serverErrSave: 'Server error — route not saved',
      routeSaved: '“{name}” saved ({n} steps)',
      routeLoadedShort: '“{name}” loaded',
      noRouteToDelete: 'No route to delete',
      confirmDeleteRoute: 'Delete the route "{name}"?',
      serverErrDelete: 'Server error — deletion failed',
      routeDeleted: '“{name}” deleted',
      noPlayerPos: 'No player position detected',
      noMapHere: 'No map at these coordinates (cliff/sea) — pick another cell',
      migrating: 'Migrating: {n} route(s) to the server…',
      launchGameHint: 'Launch the game so STAKK detects your position, then refresh the page.',
    },
    es: {
      routePlaceholder: '— ruta —',
      routeSelTitle: 'Cargar una ruta guardada',
      bigMapOn: 'Vista ampliada (scroll + arrastrar)',
      bigMapOff: 'Vista normal',
      openPlanner: 'Abrir el planificador de rutas en el navegador',
      openPlannerShort: 'Abrir el planificador',
      statusBar: 'arrastra para colocar · Ctrl+Shift+F filtros · Ctrl+Shift+↑/↓ zoom · Ctrl+Shift+O salir del modo edición · Ctrl+Shift+Q salir',
      filtersLabel: 'Filtros:',
      hidden: 'oculto',
      routeLoaded: 'Ruta «{name}» cargada',
      routeDisabled: 'Ruta desactivada',
      start: 'Salida',
      arrived: 'Llegada',
      cell: 'mapa',
      cells: 'mapas',
      total: 'en total',
      copied: 'Copiado',
      copyFailed: 'Copia fallida',
      noAccountRunning: 'ninguna cuenta iniciada',
      moveToDetect: '{n} cuenta(s) iniciada(s), muévete por el mapa para detectar tu posición',
      httpForMapGrid: 'HTTP {code} para map-grid {mapId}',
      fetchErrMapGrid: 'ERROR FETCH map-grid: {msg}',
      mapStateErr: 'ERROR map-state: {msg}',
      plannerTitle: 'Planificador de rutas',
      routeNamePlaceholder: 'Nombre de la ruta',
      saveRouteTitle: 'Guardar la ruta con este nombre',
      save: 'Guardar',
      loadRoutePlaceholder: '— cargar una ruta —',
      deleteRouteTitle: 'Eliminar la ruta actual',
      delete: 'Eliminar',
      clearTitle: 'Quitar todas las etapas',
      clear: 'Vaciar',
      recenterTitle: 'Centrar en mi posición actual',
      recenter: 'Centrar',
      followTitle: 'Centrar automáticamente al cambiar de mapa',
      follow: 'Seguir',
      radiusDecTitle: 'Reducir el radio',
      radiusIncTitle: 'Ampliar el radio',
      steps: 'etapa(s)',
      helpClick: 'añadir/quitar una etapa',
      helpDrag: 'mover el mapa',
      helpRadius: 'ampliar el radio',
      pickResources: 'Selecciona los recursos a mostrar:',
      shownResources: 'Recursos mostrados:',
      selectAll: 'Seleccionar todo',
      deselectAll: 'Deseleccionar todo',
      noCurrentMap: 'Ningún mapa actual — juega en el juego para que STAKK lo detecte.',
      cellsWithResources: '{n} mapas con recursos cargados — elige un filtro arriba',
      cellsShown: '{n} mapa(s) mostrado(s) de {total} con recursos',
      nameTheRoute: 'Ponle un nombre a la ruta',
      addOneStep: 'Añade al menos una etapa',
      serverErrSave: 'Error del servidor — ruta no guardada',
      routeSaved: '«{name}» guardada ({n} etapas)',
      routeLoadedShort: '«{name}» cargada',
      noRouteToDelete: 'Ninguna ruta que eliminar',
      confirmDeleteRoute: '¿Eliminar la ruta "{name}"?',
      serverErrDelete: 'Error del servidor — no se pudo eliminar',
      routeDeleted: '«{name}» eliminada',
      noPlayerPos: 'No se detecta la posición del jugador',
      noMapHere: 'Ningún mapa en estas coordenadas (acantilado/mar) — elige otra casilla',
      migrating: 'Migración: {n} ruta(s) al servidor…',
      launchGameHint: 'Inicia el juego para que STAKK detecte tu posición y luego recarga la página.',
    },
    de: {
      routePlaceholder: '— Route —',
      routeSelTitle: 'Gespeicherte Route laden',
      bigMapOn: 'Erweiterte Ansicht (scrollen + ziehen)',
      bigMapOff: 'Normale Ansicht',
      openPlanner: 'Routenplaner im Browser öffnen',
      openPlannerShort: 'Planer öffnen',
      statusBar: 'ziehen zum Positionieren · Ctrl+Shift+F Filter · Ctrl+Shift+↑/↓ Zoom · Ctrl+Shift+O Bearbeitungsmodus verlassen · Ctrl+Shift+Q beenden',
      filtersLabel: 'Filter:',
      hidden: 'ausgeblendet',
      routeLoaded: 'Route „{name}“ geladen',
      routeDisabled: 'Route deaktiviert',
      start: 'Start',
      arrived: 'Angekommen',
      cell: 'Karte',
      cells: 'Karten',
      total: 'insgesamt',
      copied: 'Kopiert',
      copyFailed: 'Kopieren fehlgeschlagen',
      noAccountRunning: 'kein Konto gestartet',
      moveToDetect: '{n} Konto/Konten gestartet, bewege dich auf der Karte, damit deine Position erkannt wird',
      httpForMapGrid: 'HTTP {code} für map-grid {mapId}',
      fetchErrMapGrid: 'FETCH-FEHLER map-grid: {msg}',
      mapStateErr: 'map-state FEHLER: {msg}',
      plannerTitle: 'Routenplaner',
      routeNamePlaceholder: 'Routenname',
      saveRouteTitle: 'Route unter diesem Namen speichern',
      save: 'Speichern',
      loadRoutePlaceholder: '— Route laden —',
      deleteRouteTitle: 'Aktuelle Route löschen',
      delete: 'Löschen',
      clearTitle: 'Alle Etappen entfernen',
      clear: 'Leeren',
      recenterTitle: 'Auf meine aktuelle Position zentrieren',
      recenter: 'Zentrieren',
      followTitle: 'Automatisch zentrieren, wenn du die Karte wechselst',
      follow: 'Folgen',
      radiusDecTitle: 'Radius verkleinern',
      radiusIncTitle: 'Radius vergrößern',
      steps: 'Etappe(n)',
      helpClick: 'Etappe hinzufügen/entfernen',
      helpDrag: 'Karte verschieben',
      helpRadius: 'Radius vergrößern',
      pickResources: 'Wähle die anzuzeigenden Ressourcen:',
      shownResources: 'Angezeigte Ressourcen:',
      selectAll: 'Alle auswählen',
      deselectAll: 'Alle abwählen',
      noCurrentMap: 'Keine aktuelle Karte — spiele im Spiel, damit STAKK sie erkennt.',
      cellsWithResources: '{n} Karten mit Ressourcen geladen — wähle oben einen Filter',
      cellsShown: '{n} von {total} Karten mit Ressourcen angezeigt',
      nameTheRoute: 'Gib der Route einen Namen',
      addOneStep: 'Füge mindestens eine Etappe hinzu',
      serverErrSave: 'Serverfehler — Route nicht gespeichert',
      routeSaved: '„{name}“ gespeichert ({n} Etappen)',
      routeLoadedShort: '„{name}“ geladen',
      noRouteToDelete: 'Keine Route zum Löschen',
      confirmDeleteRoute: 'Route "{name}" löschen?',
      serverErrDelete: 'Serverfehler — Löschen fehlgeschlagen',
      routeDeleted: '„{name}“ gelöscht',
      noPlayerPos: 'Keine Spielerposition erkannt',
      noMapHere: 'Keine Karte an diesen Koordinaten (Klippe/Meer) — wähle ein anderes Feld',
      migrating: 'Migration: {n} Route(n) auf den Server…',
      launchGameHint: 'Starte das Spiel, damit STAKK deine Position erkennt, und lade die Seite neu.',
    },
    pt: {
      routePlaceholder: '— rota —',
      routeSelTitle: 'Carregar uma rota salva',
      bigMapOn: 'Vista ampliada (scroll + arrastar)',
      bigMapOff: 'Vista normal',
      openPlanner: 'Abrir o planejador de rotas no navegador',
      openPlannerShort: 'Abrir o planejador',
      statusBar: 'arrasta para posicionar · Ctrl+Shift+F filtros · Ctrl+Shift+↑/↓ zoom · Ctrl+Shift+O sair do modo edição · Ctrl+Shift+Q sair',
      filtersLabel: 'Filtros:',
      hidden: 'oculto',
      routeLoaded: 'Rota «{name}» carregada',
      routeDisabled: 'Rota desativada',
      start: 'Partida',
      arrived: 'Chegada',
      cell: 'mapa',
      cells: 'mapas',
      total: 'no total',
      copied: 'Copiado',
      copyFailed: 'Falha ao copiar',
      noAccountRunning: 'nenhuma conta iniciada',
      moveToDetect: '{n} conta(s) iniciada(s), move-te no mapa para detectar a tua posição',
      httpForMapGrid: 'HTTP {code} para map-grid {mapId}',
      fetchErrMapGrid: 'ERRO FETCH map-grid: {msg}',
      mapStateErr: 'ERRO map-state: {msg}',
      plannerTitle: 'Planejador de rotas',
      routeNamePlaceholder: 'Nome da rota',
      saveRouteTitle: 'Salvar a rota com este nome',
      save: 'Salvar',
      loadRoutePlaceholder: '— carregar uma rota —',
      deleteRouteTitle: 'Excluir a rota atual',
      delete: 'Excluir',
      clearTitle: 'Remover todas as etapas',
      clear: 'Limpar',
      recenterTitle: 'Centrar na minha posição atual',
      recenter: 'Centrar',
      followTitle: 'Centrar automaticamente ao mudar de mapa',
      follow: 'Seguir',
      radiusDecTitle: 'Reduzir o raio',
      radiusIncTitle: 'Aumentar o raio',
      steps: 'etapa(s)',
      helpClick: 'adicionar/remover uma etapa',
      helpDrag: 'mover o mapa',
      helpRadius: 'aumentar o raio',
      pickResources: 'Seleciona os recursos a mostrar:',
      shownResources: 'Recursos mostrados:',
      selectAll: 'Selecionar tudo',
      deselectAll: 'Desmarcar tudo',
      noCurrentMap: 'Nenhum mapa atual — joga no jogo para que o STAKK o detecte.',
      cellsWithResources: '{n} mapas com recursos carregados — escolhe um filtro acima',
      cellsShown: '{n} mapa(s) mostrado(s) de {total} com recursos',
      nameTheRoute: 'Dá um nome à rota',
      addOneStep: 'Adiciona pelo menos uma etapa',
      serverErrSave: 'Erro do servidor — rota não salva',
      routeSaved: '«{name}» salva ({n} etapas)',
      routeLoadedShort: '«{name}» carregada',
      noRouteToDelete: 'Nenhuma rota para excluir',
      confirmDeleteRoute: 'Excluir a rota "{name}"?',
      serverErrDelete: 'Erro do servidor — exclusão falhou',
      routeDeleted: '«{name}» excluída',
      noPlayerPos: 'Nenhuma posição de jogador detectada',
      noMapHere: 'Nenhum mapa nestas coordenadas (falésia/mar) — escolhe outra casa',
      migrating: 'Migração: {n} rota(s) para o servidor…',
      launchGameHint: 'Inicia o jogo para que o STAKK detecte a tua posição e recarrega a página.',
    },
  };

  function detect() {
    try {
      var saved = localStorage.getItem(STORE_KEY);
      if (saved && L[saved]) return saved;
    } catch (e) {}
    var nav = (navigator.language || 'fr').slice(0, 2).toLowerCase();
    return L[nav] ? nav : 'fr';
  }

  var lang = detect();
  var listeners = [];

  // t('key', {name:'x'}) — les placeholders {xxx} sont remplacés par vars.xxx
  function t(key, vars) {
    var s = (L[lang] && L[lang][key]) || L.fr[key] || key;
    if (vars) {
      for (var k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
    }
    return s;
  }

  function setLang(next, silent) {
    if (!L[next] || next === lang) return false;
    lang = next;
    try { localStorage.setItem(STORE_KEY, next); } catch (e) {}
    if (!silent) listeners.forEach(function (fn) { try { fn(next); } catch (e) {} });
    return true;
  }

  // Nom d'un item dofusdb dans la langue courante (fallback fr puis en)
  function itemName(names, id) {
    var n = names && names[id];
    if (!n) return 'id ' + id;
    return n[lang] || n.fr || n.en || ('id ' + id);
  }

  // Récupère la langue choisie dans l'UI STAKK et prévient la page si elle
  // a changé. Silencieux si la route n'existe pas (stakk.exe trop ancien).
  function sync(stakkUrl) {
    return fetch(stakkUrl + '/api/overlay/lang', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.lang) setLang(j.lang); })
      .catch(function () {});
  }

  // Poll périodique : la langue peut changer pendant que l'overlay tourne.
  function autoSync(stakkUrl, ms) {
    sync(stakkUrl);
    setInterval(function () { sync(stakkUrl); }, ms || 5000);
  }

  window.STAKK_I18N = {
    langs: LANGS,
    t: t,
    setLang: setLang,
    itemName: itemName,
    sync: sync,
    autoSync: autoSync,
    get lang() { return lang; },
    onChange: function (fn) { listeners.push(fn); },
  };
})();
