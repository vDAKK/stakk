# STAKK

> Multi-account launcher for Dofus 3 and Dofus Touch — play more accounts, without leaving your PC.

![STAKK](https://raw.githubusercontent.com/vDAKK/stakk/main/docs/preview.png)

## Features

### Dofus 3 (PC)

- Import your accounts from the official Ankama launcher
- Use unlimited accounts
- Launch multiple Dofus 3 accounts simultaneously
- Mono-account server bypass
- Shield certificate management (Email & OTP / Authenticator)
- Network groups (bind accounts to different IPs or SOCKS5 proxies)
- Account health indicators

### Dofus Touch (mobile)

- Play Dofus Touch directly in your browser through a USB-tethered Android phone
- Isolated virtual display — your phone's home screen stays private
- **Multi-instance via APK cloning**: open several Dofus Touch accounts in parallel tabs on a single phone (APK clone pipeline powered by `apktool` + `uber-apk-signer`)
- Real-time touch input via scrcpy protocol (bypasses ya-webadb to work on Samsung foldables)
- Keyboard forwarding to the game (chat, commands, …)
- **Key-to-touch macros**: draw a region on the canvas, bind a PC key, press the key → instant tap in-game
- **Tab shortcuts**: `Alt+1..9` / `Alt+←/→` to switch instances

### Global

- Discord authentication
- One-time **3-day free trial**
- Multi-language UI (FR, EN, ES, DE, PT)

## Download

**[Download latest release](https://github.com/vDAKK/stakk/releases/latest)**

## Quick Start — Dofus 3 PC

1. Download and extract the latest release
2. Run `stakk.exe`
3. The web interface opens automatically
4. Connect with Discord
5. Your accounts are imported automatically from the Ankama Launcher
6. Select accounts and click **PLAY**
7. To close STAKK, press close STAKK at the top right of the web interface

## Quick Start — Dofus Touch

1. On your phone: enable **Developer options → USB debugging**
2. Plug the phone into your PC via USB, choose **Transfer files** / **MIDI** as USB mode (not "Charge only")
3. In STAKK, choose **Dofus Touch** in the top-left game selector
4. Click **Connecter téléphone** in the sidebar
5. Accept the USB debugging prompt on the phone
6. Dofus Touch starts in a clean virtual display inside the browser canvas
7. Optional — click **Cloner cette instance** to create a second account slot installed side-by-side with the original (uses APK cloning under the hood)
8. Click **Macro** in the sidebar to bind a PC key to a canvas region (draw → press the key to record)

## Requirements

- Windows 10/11
- Chromium-based browser (Chrome, Edge, Brave) for Dofus Touch — WebUSB is not available on Firefox/Safari
- Dofus 3 installed via Ankama Launcher (for PC mode)
- An Android phone with USB debugging enabled (for Dofus Touch mode) — tested on Galaxy Z Fold 4 / Android 15+
