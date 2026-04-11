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
- Subscription system with crypto payments (USDT TRC20)
- Auto-updater
- Multi-language (FR, EN, ES, DE, PT)

## Download

**[Download latest release](https://github.com/vDAKK/stakk/releases/latest)**

| Version | Date | Download |
|---------|------|----------|
| v1.1.0 | 2026-04-11 | [stakk-v1.1.0.zip](https://github.com/vDAKK/stakk/releases/download/v1.1.0/stakk-v1.1.0.zip) |

## Quick Start

1. Download and extract the latest release
2. Run `stakk.exe`
3. The web interface opens automatically
4. Connect with Discord
5. Your accounts are imported automatically from the Ankama Launcher
6. Select accounts and click **PLAY**

## Pricing

| Duration | Price |
|----------|-------|
| 7 days | 1.50 USDT |
| 15 days | 3 USDT |
| 30 days | 5 USDT |
| 60 days | 9 USDT |
| 90 days | 13 USDT |
| 180 days | 24 USDT |
| 365 days | 40 USDT |

Payment via USDT (TRC20) — automatic detection.

## Requirements

- Windows 10/11
- Dofus 3 installed via Ankama Launcher

## How it works

1. **stakk.exe** runs locally and exposes an API on `localhost:3000`
2. The web interface communicates with the local API
3. Frida hooks intercept game connections and replace device identifiers
4. Each account gets a unique fingerprint, allowing multi-account on mono servers

## Support

Join our Discord for help and updates.

## Disclaimer

This tool is for educational purposes. Use at your own risk.
