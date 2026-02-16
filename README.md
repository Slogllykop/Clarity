# Clarity

A digital wellbeing Chrome extension that helps you track browsing activity, set website time limits, and stay in control of your screen time, all while keeping your data fully offline.

## Features

- **Activity Tracking**: Automatically tracks time spent on every website with per-domain breakdowns, visit counts, and favicon caching.
- **Dashboard**: A donut chart showing today's browsing distribution at a glance, with a live website visit counter.
- **Usage Analytics**: Analyze long-term browsing trends with monthly, quarterly, and bi-annual charts.
- **Activity Details**: Interactive weekly bar chart with day-by-day navigation and a ranked list of all visited websites.
- **Website Timers**: Set daily time limits for specific websites. When exceeded, the site is blocked for the rest of the day (resets at midnight).
- **Parental Controls**: Password-protected URL blocking with security question recovery. Uses SHA-256 hashing via the Web Crypto API.
- **Screen Time Reminders**: Browser notifications at 30 min, 1 hr, and 2 hr thresholds per website.
- **Data Management**: Backup all your tracking data to a JSON file and restore it anytime.
- **Blocked Page**: A custom full-page screen shown for timer-exceeded or parentally-blocked websites, with context-aware messaging.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript |
| Styling | Tailwind CSS v4 |
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
└── src/
    ├── main.tsx             # Popup React root
    ├── App.tsx              # Screen router
    ├── blocked.tsx          # Blocked page React root
    ├── index.css            # Global styles & Tailwind theme
    ├── background/
    │   └── service-worker.ts   # Activity tracking, timers, blocking
    ├── screens/
    │   ├── Dashboard.tsx           # Main donut chart view
    │   ├── ActivityDetails.tsx     # Weekly chart + website list
    │   ├── UsageAnalytics.tsx      # Monthly/Quarterly/Bi-annual trends
    │   ├── WebsiteTimers.tsx       # Per-site time limit management
    │   ├── ParentalControls.tsx    # Password-protected URL blocking
    │   ├── ScreenTimeReminders.tsx # Notification toggle & info
    ├── components/
    │   ├── CircularChart.tsx    # SVG donut chart
    │   ├── WeeklyBarChart.tsx   # 7-day bar chart (Recharts)
    │   ├── WebsiteList.tsx      # Ranked website list w/ favicons
    │   ├── FeatureCard.tsx      # Dashboard navigation cards
    │   └── ui/                  # Radix-based shared UI primitives
    ├── db/
    │   ├── database.ts      # IndexedDB wrapper (ClarityDatabase)
    │   └── utils.ts         # Time formatting, date helpers, hashing
    ├── hooks/
    │   └── useScreenNavigation.ts  # Simple state-based routing
    ├── types/
    │   └── index.ts         # All TypeScript interfaces
    ├── constants/
    │   └── layout.ts        # Extension dimensions (400×600)
    └── lib/
        ├── utils.ts         # cn() class merge utility
        └── domain-utils.ts  # Domain display name helpers
```

## How It Works

The **background service worker** listens to Chrome tab and window events (`tabs.onActivated`, `tabs.onUpdated`, `windows.onFocusChanged`, etc.) to track which website is active. It saves accumulated time to IndexedDB every 10 seconds and updates `declarativeNetRequest` rules to enforce timers and parental blocks.

The **popup UI** communicates with the service worker via `chrome.runtime.sendMessage` to fetch stats, manage timers, and toggle settings. All data stays local in IndexedDB, nothing leaves the browser.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server with HMR |
| `pnpm build` | Type-check + production build |
| `pnpm lint` | Run Biome linter |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Format code with Biome |

## License

[MIT](LICENSE)
