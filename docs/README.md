<div align="center">

<img src="https://raw.githubusercontent.com/vDAKK/stakk/main/docs/stakk.ico" alt="STAKK" width="128" height="128">

# STAKK

**Joue plus de comptes Dofus, sur un seul PC.**

*Lance autant d'instances que ta machine peut encaisser, switch d'un compte à l'autre **d'un seul appui clavier**, sans usine à gaz. Dofus 3, Dofus Retro, Wakfu et Dofus Touch — un seul outil.*

[![Version](https://img.shields.io/github/v/release/vDAKK/stakk?display_name=tag&label=version&color=1abc9c)](https://github.com/vDAKK/stakk/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2B-0078D6?logo=windows)](https://github.com/vDAKK/stakk/releases)

**[Site de présentation](https://vdakk.github.io/stakk/about.html)** · **[Télécharger](https://github.com/vDAKK/stakk/releases/latest)**

</div>

---

> ⚠️ **Attention aux contrefaçons.** Le seul endroit légitime pour télécharger
> STAKK est la page [Releases de ce dépôt GitHub](https://github.com/vDAKK/stakk/releases).
> Tout autre site (forums, pages de téléchargement tiers, « miroirs »…) ne
> provient pas de moi et peut contenir un binaire modifié.

## Aperçu

![STAKK](https://raw.githubusercontent.com/vDAKK/stakk/main/docs/preview.png)
![Overlay](https://raw.githubusercontent.com/vDAKK/stakk/main/docs/overlay.png)

## Pourquoi STAKK ?

Tu joues à plusieurs comptes mais tu en as marre de jongler entre des
launchers, des proxies bricolés et des clones de fenêtres ? STAKK
centralise **l'import, le lancement et la gestion** de tous tes comptes
Dofus dans une seule interface — tu choisis qui lance, tu cliques sur
PLAY, ça part.

## Fonctionnalités

- 🚀 **Import automatique** des comptes depuis le launcher Ankama —
  aucune saisie d'identifiants
- ♾️ **Comptes illimités** lancés en parallèle sur un seul PC
- 🎮 **4 jeux supportés** : Dofus 3, Dofus Retro, Wakfu, Dofus Touch
- 🛡️ **Shield intégré** — Email & OTP / Authenticator gérés sans friction
- 🌐 **Groupes réseau** — associe chaque compte à une IP ou à un proxy
  SOCKS5 (indispensable sur Dofus Retro)
- ⌨️ **Raccourcis clavier** pour switcher d'un compte à l'autre instantanément
- 💚 **Indicateurs de santé** des comptes : état du Shield, validité des
  clés, activité récente
- 🗺️ **Overlay de récolte** affichant les ressources autour de ta position
  et qui s'adapte à tes déplacements
- 🎨 **Interface multilingue** FR · EN · ES · DE · PT, thème sombre
- 🔄 **Mises à jour transparentes** — les correctifs protocole et
  logiques de lancement sont appliqués en hot-update, sans télécharger
  une nouvelle version à chaque patch
- 📱 **Dofus Touch** dans le navigateur via téléphone Android branché en
  USB — multi-instance par clonage d'APK, macros touche → clic, raccourcis
  `Alt+1..9` pour changer d'instance

## Démarrage en 4 étapes

<div align="center">

| 1️⃣ &nbsp; **Télécharge** | 2️⃣ &nbsp; **Lance** | 3️⃣ &nbsp; **Choisis** | 4️⃣ &nbsp; **Play** |
|:--|:--|:--|:--|
| Récupère le `.zip` depuis [Releases](https://github.com/vDAKK/stakk/releases) et extrais-le où tu veux. | Double-clique sur `STAKK`. L'interface web s'ouvre toute seule dans ton navigateur. | En haut à gauche, choisis le jeu (**Dofus 3**, **Retro**, **Wakfu** ou **Touch**). Tes comptes sont déjà importés. | Coche les comptes à lancer, clique sur **PLAY**. C'est tout. |

[![Télécharger STAKK](https://img.shields.io/badge/%E2%AC%87%EF%B8%8F_T%C3%A9l%C3%A9charger_STAKK-1abc9c?style=for-the-badge&labelColor=0a0d12)](https://github.com/vDAKK/stakk/releases/latest)

</div>

Compatible Windows 10 et Windows 11 (64-bit). Pour Dofus Touch, un
navigateur Chromium (Chrome, Edge, Brave) est requis — WebUSB n'est pas
disponible sur Firefox / Safari.

## Démarrage rapide — Dofus 3 / Retro / Wakfu (PC)

1. Télécharge et extrais la dernière release
2. Lance `STAKK`
3. L'interface web s'ouvre automatiquement
4. Tes comptes sont importés depuis le Launcher Ankama
5. En haut à gauche, choisis le jeu (**Dofus 3**, **Retro** ou **Wakfu**)
6. Sélectionne les comptes et clique sur **PLAY**
7. Pour fermer STAKK, clique sur "Fermer STAKK" en haut à droite de
   l'interface

> ⚠️ **Dofus Retro** : un seul compte par IP autorisé par Ankama.
> Utilise une seconde connexion (ex. clé 4G USB) + un groupe réseau dédié
> pour lancer un compte supplémentaire.

## Démarrage rapide — Dofus Touch

1. Sur le téléphone : active **Options développeur → Débogage USB**
2. Branche le téléphone en USB, choisis **Transfert de fichiers** /
   **MIDI** comme mode USB (pas "Charge uniquement")
3. Dans STAKK, sélectionne **Dofus Touch** dans le sélecteur de jeu en
   haut à gauche
4. Clique sur **Connecter téléphone** dans la barre latérale
5. Accepte l'invite de débogage USB sur le téléphone
6. Dofus Touch démarre dans un écran virtuel propre à l'intérieur du
   canvas du navigateur
7. Optionnel — clique sur **Cloner cette instance** pour créer un
   second emplacement de compte installé en parallèle de l'original
   (clonage d'APK sous le capot)
8. Clique sur **Macro** dans la barre latérale pour associer une touche
   PC à une zone du canvas (dessine la zone → appuie sur la touche pour
   l'enregistrer)

## FAQ

**Est-ce que STAKK fonctionne sur Mac ou Linux ?**
Pour le moment, STAKK cible Windows 10 / 11 64-bit. Pour Dofus Touch tu
as besoin d'un navigateur basé sur Chromium (Chrome, Edge, Brave) — WebUSB
n'est pas disponible sur Firefox ou Safari.

**Quelle est la limite de comptes simultanés ?**
Sur **Dofus 3** et **Wakfu** : illimité, tant que ton PC tient le coup.
Sur **Dofus Retro** : 1 compte par IP (règle Ankama) — utilise une
seconde connexion (ex. clé 4G USB) pour chaque compte supplémentaire.

**Comment fonctionne le multi-compte sur Dofus Touch ?**
On clone l'APK Dofus Touch (via `apktool` + `uber-apk-signer`) pour
créer plusieurs installations indépendantes sur un seul téléphone Android
branché en USB. Chaque clone tourne dans son propre onglet, avec un
affichage virtuel isolé — ton écran d'accueil reste privé.

**Mes identifiants sont-ils en sécurité ?**
STAKK lit les comptes directement depuis le launcher Ankama installé
localement et les stocke chiffrés sur ton PC. Aucun mot de passe ne
transite en clair.

**Windows affiche un avertissement bleu au premier lancement, c'est normal ?**
Oui. STAKK n'est pas signé avec un **certificat code-signing** (qui coûte
~300 €/an et n'est pas justifiable pour un projet de ce type). Windows
SmartScreen affiche donc une alerte par précaution sur tout exécutable
peu connu. Clique sur **« Informations complémentaires »** puis
**« Exécuter quand même »**.

**Comment je désinstalle l'application ?**
Supprime simplement le dossier où tu as extrait `STAKK`. Aucun registre
Windows modifié, aucun service installé.

**STAKK se met à jour tout seul ?**
Oui. Les correctifs protocole et logiques de lancement sont appliqués
automatiquement — pas besoin de retélécharger une nouvelle version à
chaque patch d'Ankama.

## Prérequis

- Windows 10 / 11 (64-bit)
- Dofus 3 / Dofus Retro / Wakfu installés via le Launcher Ankama (pour
  le mode PC)
- Pour **Dofus Touch** : un navigateur Chromium + un téléphone Android
  avec le débogage USB activé (testé sur Galaxy Z Fold 4 / Android 15+)

## Disclaimer

Outil tiers non affilié à Ankama Games ni au jeu Dofus. À utiliser à
tes risques et à consulter conformément aux conditions générales
d'utilisation des jeux concernés.
