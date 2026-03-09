# Clarity

A digital wellbeing Chrome extension that helps you track browsing activity, set website time limits, and stay in control of your screen time, all while keeping your data fully offline.

## Features

- **Activity Tracking**: Automatically tracks active time spent on every website with per-domain breakdowns, visit counts, and favicon caching. Intelligently pauses tracking after 15 minutes of inactivity or system lock to ensure absolute time accuracy.
- **Dashboard**: A comprehensive circular chart displaying daily browsing distribution at a glance, featuring a live website visit counter.
- **Usage Analytics**: Analyze long-term browsing trends with detailed monthly, quarterly, and bi-annual charts.
- **Activity Details**: Interactive weekly bar chart with day-by-day navigation, usage comparisons against previous days, and a ranked list of visited websites.
- **Website Timers**: Set daily time limits for specific websites. Includes integrated search and filtering for efficient management. Websites are blocked for the remainder of the day once limits are exceeded.
- **Daily Targets**: Set a cumulative daily screen time goal and receive notifications summarizing your progress and adherence to your targets.
- **Parental Controls**: Password-protected URL blocking with security question recovery. Security is ensured via SHA-256 hashing through the Web Crypto API.
- **Screen Time Reminders**: Periodic browser notifications delivered at specific thresholds to prevent excessive continuous browsing.
- **Data Portability**: Securely backup all tracking data to a JSON file and restore it at any time to ensure data continuity.
- **Blocked Page**: A custom full-screen interface for timer-exceeded or parentally-blocked websites, providing context-aware messaging and encouragement.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | Radix UI, Base UI, Sonner |
| Visualization | Recharts |
| Icons | Tabler Icons, Lucide React |
| Data | IndexedDB (offline-first architecture) |
| Build | Vite 7 + [@crxjs/vite-plugin](https://github.com/nicedoc/crxjs) |
| Linting | Biome.js |
| Extension | Chrome Manifest V3 |
| Package Manager | pnpm |

React Compiler is enabled via `babel-plugin-react-compiler` for automated performance optimization through memoization.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher)
- [pnpm](https://pnpm.io/)

### Installation and Build

```bash
# Install dependencies
pnpm install

# Development environment (with hot reload)
pnpm dev

# Production build
pnpm build
```

### Loading into Chrome

1. Execute `pnpm build` (or use `pnpm dev` for active development).
2. Open `chrome://extensions` in your browser.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Select **Load unpacked** and choose the `dist/` directory.
5. Pin the Clarity extension to your toolbar for easy access.

## Project Structure

```
├── manifest.json           # Chrome MV3 manifest
├── index.html              # Popup entry point
├── blocked.html            # Blocked-site page entry point
├── rules.json              # Declarative net request rules
├── vite.config.ts          # Vite, CRXJS, and Tailwind configuration
├── biome.json              # Linter and formatter configuration
├── src/
│   ├── main.tsx           # Extension entry point
│   ├── App.tsx            # Root component and screen router
│   ├── blocked.tsx        # Blocked page entry point
│   ├── index.css          # Global styles and Tailwind directives
│   ├── background/
│   │   └── service-worker.ts # Background logic: tracking, timers, and blocking
│   ├── features/          # Feature-specific modules
│   │   ├── activity/      # Activity details and weekly statistics
│   │   ├── analytics/     # Long-term usage patterns
│   │   ├── dashboard/     # Main overview and circular visualization
│   │   ├── parental-controls/ # Secure URL blocking
│   │   ├── reminders/     # Screen time notifications
│   │   ├── targets/        # Daily screen time goal management
│   │   └── timers/        # Individual website limit management
│   ├── components/
│   │   └── ui/            # Reusable UI primitives (Radix, Sonner)
│   ├── hooks/             # Custom React hooks
│   ├── db/                # IndexedDB layer and database utilities
│   ├── lib/               # Utility functions and helper modules
│   ├── types/             # TypeScript type definitions
│   └── constants/         # Application-wide constants
```

## How It Works

The **background service worker** monitors Chrome tab and window events (such as `tabs.onActivated`, `tabs.onUpdated`, and `idle.onStateChanged`) to accurately track active browsing time. It intelligently suspends tracking when the system is inactive for 15 minutes or locked. Data is persisted to IndexedDB at 10-second intervals. It also dynamically updates `declarativeNetRequest` rules to enforce active timers and parental blocks.

The **popup UI** interacts with the service worker through `chrome.runtime.sendMessage` to retrieve statistics, manage configurations, and toggle features. All data remains local within IndexedDB, prioritizing user privacy and offline functionality.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Starts the Vite development server with HMR |
| `pnpm build` | Performs type-checking followed by a production build |
| `pnpm lint` | Executes the Biome linter |
| `pnpm lint:fix` | Automatically resolves linting issues |
| `pnpm format` | Formats the codebase using Biome |
| `pnpm release` | Generates a new release using standard-version |

## License

This project is licensed under the [MIT License](LICENSE).

