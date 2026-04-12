# STAKK

> Multi-account launcher for Dofus 3 — Launch multiple accounts on mono-account servers.

![STAKK](https://raw.githubusercontent.com/vDAKK/stakk/main/docs/preview.png)

## Features

- Launch multiple Dofus 3 accounts simultaneously
- Mono-account server bypass (unique device fingerprint per account)
- Shield certificate management (Email & OTP/Authenticator)
- Network groups (bind to different IPs or SOCKS5 proxies)
- Auto-refresh API keys
- Account health indicators
- Discord authentication
- Multi-language (FR, EN, ES, DE, PT)

## Download

**[Download latest release](https://github.com/vDAKK/stakk/releases/latest)**

## Quick Start

1. Download and extract the latest release
2. Run `stakk.exe`
3. The web interface opens automatically
4. Connect with Discord
5. Your accounts are imported automatically from the Ankama Launcher
6. Select accounts and click **PLAY**

Payment via USDT (TRC20) — automatic detection.

## Requirements

- Windows 10/11
- Dofus 3 installed via Ankama Launcher

## How it works

1. **stakk.exe** runs locally and exposes an API on `localhost:3000`
2. The web interface communicates with the local API
4. Each account gets a unique fingerprint, allowing multi-account on mono servers
