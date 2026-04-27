# STAKK

**[Site de présentation](https://vdakk.github.io/stakk/about.html)** · **[Télécharger](https://github.com/vDAKK/stakk/releases/latest)** ·

> Joue en multi compte, sur monocompte Dofus ou Dofus Retro avec un seul PC.
> Le tool se met à jour automatiquement pour être fonctionnel après chaque mise à jour

![STAKK](https://raw.githubusercontent.com/vDAKK/stakk/main/docs/preview.png)
![OVERLAY](https://raw.githubusercontent.com/vDAKK/stakk/main/docs/overlay.png)

## Fonctionnalités

### Dofus 3 (PC)

- Import automatique des comptes depuis le launcher officiel Ankama
- Nombre de comptes illimité
- Lancement simultané de plusieurs comptes Dofus 3
- Contournement des serveurs mono-compte
- Gestion des certificats Shield (Email & OTP / Authenticator)
- Groupes réseau (associer des comptes à différentes IP ou proxies SOCKS5)
- Indicateurs de santé des comptes
- Possibilité d'assigner des raccourics clavier pour switcher rapidement entre les comptes
- Overlay affichant les ressources récoltable autour de la position du joueur avec adaptation en fonction de ses déplacements

### Dofus Retro (PC)

- Import des comptes depuis le launcher Ankama
- Lancement de plusieurs instances Dofus Retro en parallèle
- **Limite 1 compte par adresse IP** : sur Dofus Retro, un seul compte par IP est autorisé par Ankama. Pour chaque compte supplémentaire, utilise une seconde carte réseau (ex. clé 4G USB) et crée un groupe réseau dédié
- Règles réseau distinctes de Dofus 3 (configurables par jeu)

### Wakfu (PC)

- Import des comptes depuis le launcher Ankama
- Groupes réseau dédiés par compte

### Dofus Touch (mobile)

- Joue à Dofus Touch directement dans le navigateur via un téléphone Android branché en USB
- Affichage virtuel isolé — l'écran d'accueil du téléphone reste privé
- **Multi-instance par clonage d'APK** : ouvre plusieurs comptes Dofus Touch en parallèle, chacun dans son propre onglet, sur un seul téléphone (pipeline de clonage APK via `apktool` + `uber-apk-signer`)
- Input tactile temps réel via le protocole scrcpy (contourne ya-webadb pour fonctionner sur les Samsung pliables)
- Transfert du clavier vers le jeu (chat, commandes, …)
- **Macros touche→clic** : dessine une zone sur le canvas, associe-la à une touche PC, appuie sur la touche → tap instantané en jeu
- **Raccourcis onglets** : `Alt+1..9` / `Alt+←/→` pour changer d'instance

## Téléchargement

**[Télécharger la dernière version](https://github.com/vDAKK/stakk/releases/latest)**

Plus d'infos sur la **[page de présentation du logiciel](https://vdakk.github.io/stakk/about.html)**.

## Démarrage rapide — Dofus 3 / Retro / Wakfu (PC)

1. Télécharge et extrais la dernière release
2. Lance `STAKK`
3. L'interface web s'ouvre automatiquement
4. Connecte-toi avec Discord
5. Tes comptes sont importés automatiquement depuis le Launcher Ankama
6. En haut à gauche, choisis le jeu (**Dofus 3**, **Retro** ou **Wakfu**)
7. Sélectionne les comptes et clique sur **PLAY**
8. Pour fermer STAKK, clique sur "Fermer STAKK" en haut à droite de l'interface

> ⚠️ **Dofus Retro** : un seul compte par IP autorisé par Ankama. Utilise une seconde connexion (ex. 4G USB) + un groupe réseau dédié pour lancer un compte supplémentaire.

## Démarrage rapide — Dofus Touch

1. Sur le téléphone : active **Options développeur → Débogage USB**
2. Branche le téléphone en USB, choisis **Transfert de fichiers** / **MIDI** comme mode USB (pas "Charge uniquement")
3. Dans STAKK, sélectionne **Dofus Touch** dans le sélecteur de jeu en haut à gauche
4. Clique sur **Connecter téléphone** dans la barre latérale
5. Accepte l'invite de débogage USB sur le téléphone
6. Dofus Touch démarre dans un écran virtuel propre à l'intérieur du canvas du navigateur
7. Optionnel — clique sur **Cloner cette instance** pour créer un second emplacement de compte installé en parallèle de l'original (clonage d'APK sous le capot)
8. Clique sur **Macro** dans la barre latérale pour associer une touche PC à une zone du canvas (dessine la zone → appuie sur la touche pour l'enregistrer)

## Prérequis

- Windows 10/11
- Navigateur basé sur Chromium (Chrome, Edge, Brave) pour Dofus Touch — WebUSB n'est pas disponible sur Firefox/Safari
- Dofus 3 / Dofus Retro / Wakfu installés via le Launcher Ankama (pour le mode PC)
- Un téléphone Android avec le débogage USB activé (pour le mode Dofus Touch) — testé sur Galaxy Z Fold 4 / Android 15+
