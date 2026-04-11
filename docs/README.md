# STAKK

Multi-account launcher for Dofus 3.

![STAKK](https://raw.githubusercontent.com/vDAKK/stakk/main/docs/preview.png)

## Features

- Launch multiple Dofus 3 accounts simultaneously
- Mono-account server support (unique device fingerprint per account)
- Shield certificate management (Email & OTP/Authenticator)
- Network groups (bind to different IPs or SOCKS5 proxies)
- Auto-refresh API keys
- Account health indicators
- Launch stats per account
- Discord authentication
- Subscription system with crypto payments (USDT TRC20)
- Multi-language (FR, EN, ES, DE, PT)

## Quick Start

1. Download `stakk.exe` from [Releases](https://github.com/vDAKK/stakk/releases)
2. Place it in a folder with the `release/` directory (contains Frida bindings)
3. Run `stakk.exe`
4. The web interface opens automatically
5. Click **Import** to import your accounts from the Ankama Launcher
6. Click **Play** to launch

## Requirements

- Windows 10/11
- Dofus 3 installed via Ankama Launcher
- Node.js 18 (only if running from source)
- Frida 15 native binding (included in release)

## Running from source

```bash
npm install
node index.js
```

## Building

```bash
npm run build
```

Output: `dist/stakk.exe`

## Support

Join our Discord for help and updates.

## Disclaimer

This tool is for educational purposes. Use at your own risk.
