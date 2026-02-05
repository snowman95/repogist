# RepoGist

**One-click AI summaries for any GitHub repository.** Understand repos in 10 seconds instead of 15 minutes.

## What It Does

RepoGist is a Chrome extension that adds a "Summarize" button to every GitHub repository page. Click it, and get an instant AI-powered summary:

- **Overview** — what the project does and why it matters
- **Key Features** — top 5 capabilities
- **Tech Stack** — languages, frameworks, dependencies
- **Architecture** — design patterns and structure
- **Quick Start** — how to get started
- **Use Cases** — when and how to use it

## Install

1. Download the [latest release](https://github.com/snowman95/repogist/releases)
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/` folder

Or install from the Chrome Web Store (coming soon).

## Setup

1. Click the RepoGist icon in your toolbar
2. Enter your [Anthropic API key](https://console.anthropic.com/settings/keys)
3. Click Save

Your key is stored locally in your browser. It never leaves your device.

## Usage

- Free tier: 3 summaries per day (no key required for cached results)
- With API key: unlimited summaries
- Summaries are cached for 24 hours

## How It Works

1. Content script injects the "Summarize" button on GitHub repo pages
2. Background service worker fetches repo metadata via GitHub REST API (README, file tree, package.json)
3. Sends data to Claude Haiku for analysis
4. Displays structured summary inline on the page
5. Results are cached locally for 24h

## Tech Stack

- Manifest V3 (Chrome Extension)
- TypeScript + React
- Vite + CRXJS
- Claude Haiku API (via Anthropic)
- GitHub REST API v3

## Build from Source

```bash
git clone https://github.com/snowman95/repogist.git
cd repogist
npm install
npm run build  # Output in dist/
```

## Privacy

- No tracking, no analytics, no data collection
- Your API key stays in local Chrome storage
- No server-side component
- Open source for transparency

## License

MIT
