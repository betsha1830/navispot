<p align="center">
  <img src="public/navispot.png" alt="NaviSpot Logo" width="200">
</p>

# NaviSpot

> Export Spotify playlists to your self-hosted Navidrome music server

[![Live Demo](https://img.shields.io/badge/Live%20Demo-navispot.gaga.pro.et-blue?style=flat&logo=vercel)](https://navispot.gaga.pro.et/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [🎯 How It Works](#-how-it-works)
- [📸 Screenshots](#-screenshots)
- [⚙️ Setup](#%EF%B8%8F-setup)
- [📦 Deployment](#-deployment)
- [💝 Donations](#-donations)
- [🛠️ Tech Stack](#%EF%B8%8F-tech-stack)
- [📚 Documentation](#-documentation)
- [📝 License](#-license)

---

## ✨ Features

- **🔗 Dual Integration** – Connect Spotify & Navidrome simultaneously
- **🎯 Smart Matching** – ISRC, fuzzy, and strict matching strategies
- **📊 Batch Export** – Export multiple playlists at once
- **🔄 Differential Exporting** – Sync only new tracks (single browser session)
- **📤 JSON Export** – Export unmatched tracks as JSON
- **⚡ Real-time Progress** – Live export tracking with match statistics
- **👁️ Export Preview** – Review matches before committing

---

## 🚀 Quick Start

1. **Connect** – Login to Spotify and enter Navidrome credentials
2. **Select** – Browse and check playlists to export
3. **Export** – Review matches and start the transfer

---

## 🎯 How It Works

**Matching Strategy Chain:**

1. **ISRC** → Exact match via unique recording code
2. **Fuzzy** → Similarity matching (80% threshold)
3. **Strict** → Normalized exact string match

Unmatched tracks can be exported as JSON for later addition to Navidrome.

---

## 📸 Screenshots

|              Login              |             Dashboard              |                    Export Progress                    |
| :-----------------------------: | :--------------------------------: | :---------------------------------------------------: |
| ![Login](public/login-page.png) | ![Dashboard](public/dashboard.png) | ![Progress](public/dashboard-exporting-playlists.png) |
| Connect to Spotify & Navidrome  |    Browse and select playlists     |              Real-time progress tracking              |

---

## ⚙️ Setup

### Prerequisites

- Node.js 18.17+
- Spotify Developer account
- Running Navidrome instance

### Local Development

```bash
# Clone & install
git clone https://github.com/yourusername/navispot-plist.git
cd navispot-plist
bun install

# Configure
cp .env.example .env.local
# Edit .env.local with your credentials

# Run
bun dev
```

**Spotify Setup:**

1. Create app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Add `http://localhost:3000/api/auth/callback` to Redirect URIs
3. Copy Client ID & Secret to `.env.local`

---

## 📦 Deployment

### Docker (Recommended)

```bash
docker compose up -d
```

**Production Variables:**

```env
SPOTIFY_REDIRECT_URI=https://your-domain.com/api/auth/callback
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Update Spotify Dashboard with your production redirect URI.

---

## 💝 Donations

If NaviSpot helps you migrate your music library, consider supporting development:

| Coin           | Address                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------- |
| **BTC**        | `bc1q8madmx95n2ve8e7xr38d2fyldafxjg25ffeuts`                                                      |
| **ETH**        | `0xFee844879Bd716BE64580b8D2B8835ff76622671`                                                      |
| **BCH**        | `qqep38q5t9fm3kxe96pek4cr49xz3u4exsq0x9t4xe`                                                      |
| **TRX**        | `TM5evHNFfcy2WbrDbMpUMZdKotZw958WcG`                                                              |
| **SOL**        | `9tXhy1xhs1MkXVonNkozwxwYHHwH4iifjrFakeY5wS55`                                                    |
| **XNO (NANO)** | `nano_371m8ijecct9csm18eubojmfkf7rt1bxq4frs43bo5ybmsbpwxyywhqz9wh3`                               |
| **POL**        | `0xFee844879Bd716BE64580b8D2B8835ff76622671`                                                      |
| **LTC**        | `ltc1qaf5an5qultyw47xjees3d7uwnext2rszg93njj`                                                     |
| **XMR**        | `84euv4YWNe4WGBm8hrPWKV8PSQpGvRzsFB9jyWhSCs45Z13mfU8qAyARaiqjc9CPCcSspyprd4Qv1KfbSVaHwxH9HRNmTjC` |

**[❤️ Support on Patreon](https://www.patreon.com/c/betsha)**

Your support helps maintain and improve this open-source project! 🙏

---

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature idea? We welcome your feedback!

### Reporting Bugs 🐞

Please [open an issue](../../issues/new?labels=bug) and include:

- **Error messages** (screenshots or console logs)
- **Spotify account type** (Free or Premium)
- **Navidrome setup** (Local or Remote server)
- **Browser** you're using to access NaviSpot
- **Steps to reproduce** the issue
- **Expected vs actual behavior**

### Requesting Features ✨

Please [open an issue](../../issues/new?labels=enhancement) and include:

- **Feature description** – What you'd like to see
- **Use case** – Why this would be helpful
- **Any examples** from other apps (if applicable)

We appreciate detailed reports that help us improve NaviSpot for everyone!

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **APIs:** Spotify Web API, Navidrome Subsonic API

---

## 📚 Documentation

Feature docs available in `docs/`:

| Phase  | Features                                          |
| ------ | ------------------------------------------------- |
| **F1** | Setup, OAuth, API Clients, Auth                   |
| **F2** | Matching (ISRC, Fuzzy, Strict), Export, Favorites |
| **F3** | UI Components, Dashboard, Progress Tracking       |

See [full feature index](docs/) for details.

---

## 👥 Contributors

We appreciate all contributions to NaviSpot! Special thanks to:

| Contributor | Contribution | Date |
|-------------|--------------|------|
| **[WB2024](https://github.com/WB2024)** | Enhanced dashboard filtering: owner filter, visibility filter, and date range filtering with playlist creation date caching | Feb 2026 |

Want to contribute? Check out our [issue tracker](../../issues) for ways to help!

---

## 📝 License

MIT License – Open Source

Copyright (c) 2026 NaviSpot

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
