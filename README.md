# Clarity

A digital wellbeing Chrome extension that helps you track browsing activity, set website time limits, and stay in control of your screen time, all while keeping your data fully offline.

## Features

- **Activity Tracking**: Automatically tracks time spent on every website with per-domain breakdowns, visit counts, and favicon caching.
- **Dashboard**: A donut chart showing today's browsing distribution at a glance, with a live website visit counter.
- **Usage Analytics**: Analyze long-term browsing trends with monthly, quarterly, and bi-annual charts.
- **Activity Details**: Interactive weekly bar chart with day-by-day navigation and a ranked list of all visited websites.
- **Website Timers**: Set daily time limits for specific websites. When exceeded, the site is blocked for the rest of the day (resets at midnight). Includes search and filtering for easy management.
- **Parental Controls**: Password-protected URL blocking with security question recovery. Uses SHA-256 hashing via the Web Crypto API.
- **Screen Time Reminders**: Browser notifications at 30 min, 1 hr, and 2 hr thresholds per website.
- **Data Management**: Backup all your tracking data to a JSON file and restore it anytime.
- **Blocked Page**: A custom full-page screen shown for timer-exceeded or parentally-blocked websites, with context-aware messaging.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | Radix UI, Sonner |
| Visualization | Recharts |
| Icons | Tabler Icons, Lucide React |
| Data | IndexedDB (offline-first, no server) |
| Build | Vite 7 + [@crxjs/vite-plugin](https://github.com/nicedoc/crxjs) |
| Linting | Biome.js |
| Extension | Chrome Manifest V3 |
| Package Manager | pnpm |

React Compiler is enabled via `babel-plugin-react-compiler` for automatic memoization.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)

### Install & Build

```bash
# Install dependencies
pnpm install

# Development (hot reload)
pnpm dev

# Production build
pnpm build
```

### Load into Chrome

1. Run `pnpm build` (or use `pnpm dev` for development).
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `dist/` folder.
5. Pin the Clarity extension from the toolbar.

## Project Structure

```
├── manifest.json           # Chrome MV3 manifest
├── index.html              # Popup entry point
├── blocked.html            # Blocked-site page entry point
├── rules.json              # Declarative net request rules
├── vite.config.ts          # Vite + CRXJS + Tailwind config
├── biome.json              # Linter & formatter config
├── src/
│   ├── main.tsx           # Extension entry point
│   ├── App.tsx            # Root component & screen router
│   ├── blocked.tsx        # Blocked page entry point
│   ├── index.css          # Global styles & Tailwind directives
│   ├── background/
│   │   └── service-worker.ts # Background logic: tracking, timers, blocking
│   ├── features/          # Feature-based modules
│   │   ├── activity/      # Activity details & weekly stats
│   │   ├── analytics/     # Long-term usage trends
│   │   ├── dashboard/     # Main overview & circular chart
│   │   ├── parental-controls/ # Password-protected blocking
│   │   ├── reminders/     # Screen time notifications
│   │   └── timers/        # Website time limit management
│   ├── components/
│   │   └── ui/            # Shared UI primitives (Radix, Sonner)
│   ├── hooks/             # Custom React hooks (navigation, etc.)
│   ├── db/                # IndexedDB layer & database utilities
│   ├── lib/               # Utility functions & helpers
│   ├── types/             # TypeScript definitions
│   └── constants/         # App-wide constants
```

## How It Works

The **background service worker** listens to Chrome tab and window events (`tabs.onActivated`, `tabs.onUpdated`, `windows.onFocusChanged`, `idle.onStateChanged`, etc.) to track which website is active. It saves accumulated time to IndexedDB every 10 seconds and updates `declarativeNetRequest` rules to enforce timers and parental blocks.

The **popup UI** communicates with the service worker via `chrome.runtime.sendMessage` to fetch stats, manage timers, and toggle settings. All data stays local in IndexedDB, ensuring privacy and offline-first functionality.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server with HMR |
| `pnpm build` | Type-check + production build |
| `pnpm lint` | Run Biome linter |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Format code with Biome |
| `pnpm release` | Create a new release with standard-version |

## License

[MIT](LICENSE)
