# Clarity Browser Extension - Implementation Plan

## Project Overview
Clarity is a digital wellbeing browser extension built with React 19, TypeScript, and Manifest V3. It tracks browsing activity, provides insights, and helps users manage their screen time with features like website timers, parental controls, and screen time reminders.

---

## Tech Stack
- **Frontend**: React 19, TypeScript
- **Design**: Shadcn UI components, Tailwind CSS v4, Tabler Icons
- **Tools**: Biome.js (linting & formatting), pnpm, Manifest V3, React Compiler
- **Theme**: Dark mode only, Black/White with Green accents
- **Database**: IndexedDB (offline-first)

---

## Development Milestones

### **Milestone 1: Project Setup & Configuration**
**Goal**: Set up the development environment with all required tools and configurations.

**Tasks**:
1. Install and configure Biome.js for linting and formatting
2. Install and configure Tailwind CSS v4
3. Set up Shadcn UI component library
4. Install Tabler Icons
5. Configure build pipeline for Chrome Extension (Manifest V3)
6. Update package.json scripts for development and production builds
7. Remove ESLint and replace with Biome.js completely

**Deliverables**:
- Working dev environment with hot reload
- Biome.js configuration file
- Tailwind CSS v4 configuration
- Updated build scripts

---

### **Milestone 2: Chrome Extension Manifest & Structure**
**Goal**: Create Manifest V3 configuration and extension structure.

**Tasks**:
1. Create `manifest.json` with required permissions:
   - `tabs` - to track active tabs
   - `activeTab` - to get active tab info
   - `storage` - for local storage (backup)
   - `alarms` - for periodic checks
   - `notifications` - for screen time reminders
   - `webNavigation` - to track navigation events
   - `declarativeNetRequest` and `declarativeNetRequestWithHostAccess` - for blocking websites
2. Define extension popup HTML
3. Define background service worker
4. Define content scripts (if needed for blocking pages)
5. Set up extension icons (16x16, 32x32, 48x48, 128x128)

**Deliverables**:
- Valid `manifest.json`
- Extension structure with popup, background, and content script files
- Extension icons

---

### **Milestone 3: IndexedDB Data Layer**
**Goal**: Create a robust, modular IndexedDB schema and data access layer.

**Tasks**:
1. Design database schema:
   - **DailyActivity** table: date, totalTime, websiteCount
   - **WebsiteActivity** table: date, domain, faviconUrl, timeSpent, visitCount, lastVisit
   - **WebsiteTimers** table: domain, timeLimit, enabled
   - **BlockedWebsites** table: urlPattern, dateAdded
   - **Settings** table: passwordHash, securityQuestion, securityAnswerHash, reminderEnabled
2. Create IndexedDB wrapper/service with CRUD operations
3. Implement data models and TypeScript interfaces
4. Create utility functions for data aggregation (weekly stats, daily stats)
5. Add migration support for future schema changes

**Deliverables**:
- IndexedDB service module
- TypeScript interfaces for all data models
- Utility functions for data queries

---

### **Milestone 4: Background Service Worker - Activity Tracking**
**Goal**: Implement real-time tab and window tracking in the background.

**Tasks**:
1. Set up service worker with proper event listeners:
   - `tabs.onActivated` - when user switches tabs
   - `tabs.onUpdated` - when tab URL changes
   - `windows.onFocusChanged` - when window focus changes
   - `tabs.onRemoved` - when tab is closed
2. Implement activity tracking logic:
   - Track only active tab in active window
   - Exclude `chrome://`, `edge://`, new tab pages
   - Extract domain from URL
   - Update time tracking every second for active session
3. Fetch and cache website favicons
4. Save data to IndexedDB periodically (every 5-10 seconds)
5. Handle edge cases (computer sleep, browser restart)

**Deliverables**:
- Background service worker with activity tracking
- Favicon fetching and caching
- Real-time data persistence

---

### **Milestone 5: Main Dashboard Screen (Screen 1)**
**Goal**: Build the main landing screen with circular time distribution chart.

**Tasks**:
1. Create main layout with Clarity branding/logo
2. Implement circular chart (donut chart) showing:
   - Total time in center
   - Website distribution in outer ring
   - Group minor websites into "Others"
3. Display website visit counter below chart
4. Create navigation cards for:
   - Website Timers
   - Parental Controls
   - Screen Time Reminders
5. Make chart clickable to navigate to details screen
6. Fetch and display today's data from IndexedDB
7. Apply dark theme with green accents

**Deliverables**:
- Main dashboard UI component
- Circular chart component with data visualization
- Navigation to feature screens
- Real-time data updates

---

### **Milestone 6: Website Activity Details Screen (Screen 2)**
**Goal**: Build detailed activity screen with weekly bar chart and website list.

**Tasks**:
1. Create screen header with:
   - Total screen time for selected day
   - Day label (Today, Yesterday, or Day name + Date)
2. Implement interactive bar chart:
   - X-axis: Sun to Sat
   - Y-axis: Dynamic scale based on max time for the week
   - Highlight selected day
   - Click to select different days
3. Add day navigation with < and > buttons
4. Create website list section:
   - Website favicon/logo
   - Domain name
   - Time spent
   - Visit count
   - Sorted by time descending
5. Implement "Show all X websites" collapsible (show top 10 by default)
6. Connect to IndexedDB to fetch weekly and daily data
7. Update all sections when day selection changes

**Deliverables**:
- Activity details screen component
- Interactive bar chart component
- Website list component with collapsible
- Day navigation and selection logic

---

### **Milestone 7: Website Timer Feature**
**Goal**: Allow users to set time limits for specific websites.

**Tasks**:
1. Create website timer screen UI:
   - List of websites with timer input
   - Add/Edit/Disable timer controls
2. Implement timer storage in IndexedDB
3. Update background service worker to check timers:
   - Track time spent on timer-enabled websites
   - When limit exceeded, block access
4. Create blocked page UI (custom extension page):
   - "Time limit exceeded" message
   - Website name and limit info
   - Option to disable timer (navigates to extension)
5. Implement declarativeNetRequest rules for blocking
6. Add timer reset at midnight (new day = new limits)

**Deliverables**:
- Website timer management screen
- Timer enforcement in background worker
- Blocked page for exceeded timers

---

### **Milestone 8: Parental Controls Feature**
**Goal**: Implement password-protected URL blocking.

**Tasks**:
1. Create password setup screen:
   - Set password (with encryption using Web Crypto API)
   - Set security question and encrypted answer
2. Create password verification screen:
   - Password input on subsequent visits
   - Redirect to dashboard after successful auth
3. Create parental controls dashboard:
   - Add URL pattern to block list
   - Display blocked URLs with date added
   - Remove URL from block list
4. Implement password reset flow:
   - Show security question
   - Verify answer
   - Allow new password setup
5. Update background service worker to enforce blocks:
   - Check URL against block list
   - Redirect to blocked page
6. Create blocked page UI for parental controls

**Deliverables**:
- Password authentication system
- URL block list management UI
- Parental controls enforcement in background
- Blocked page for parental controls

---

### **Milestone 9: Screen Time Reminders Feature**
**Goal**: Implement automatic notifications for excessive screen time.

**Tasks**:
1. Create screen time reminder toggle in settings
2. Implement notification logic in background worker:
   - Monitor active website time
   - Trigger notification at thresholds (e.g., 30min, 1hr, 2hr)
   - Show website-specific notifications
3. Use Chrome Notifications API
4. Store reminder preferences in IndexedDB
5. Add notification click handlers (open extension)

**Deliverables**:
- Screen time reminder toggle
- Notification system in background worker
- Configurable thresholds

---

### **Milestone 10: Routing & Navigation**
**Goal**: Implement proper navigation between all screens.

**Tasks**:
1. Set up React Router (or simple state-based routing)
2. Create navigation flow:
   - Dashboard → Activity Details (click chart)
   - Dashboard → Website Timers (click card)
   - Dashboard → Parental Controls (click card)
   - Dashboard → Screen Time Reminders (click card)
   - Back navigation for all screens
3. Implement browser history support
4. Add transitions/animations for screen changes

**Deliverables**:
- Complete navigation system
- Smooth screen transitions
- Back button functionality

---

### **Milestone 11: UI Polish & Optimization**
**Goal**: Optimize performance and polish the user interface.

**Tasks**:
1. Implement code splitting and lazy loading for screens
2. Optimize re-renders with React.memo and useMemo
3. Add loading states and skeleton screens
4. Add empty states (no data yet)
5. Implement error boundaries
6. Add accessibility features (ARIA labels, keyboard navigation)
7. Test and optimize IndexedDB queries
8. Minimize bundle size
9. Add subtle animations and transitions

**Deliverables**:
- Optimized bundle size
- Smooth performance
- Polished UI with loading/error/empty states
- Accessible interface

---

### **Milestone 12: Testing & Bug Fixes**
**Goal**: Thoroughly test all features and fix bugs.

**Tasks**:
1. Test activity tracking accuracy:
   - Active tab tracking
   - Window focus handling
   - Sleep/wake scenarios
2. Test website timers:
   - Timer enforcement
   - Midnight reset
   - Blocked page display
3. Test parental controls:
   - Password encryption/decryption
   - URL pattern matching
   - Block enforcement
4. Test screen time reminders:
   - Notification triggers
   - Threshold accuracy
5. Test data persistence across browser restarts
6. Test with various websites and scenarios
7. Fix identified bugs
8. Performance testing and optimization

**Deliverables**:
- Bug-free extension
- Validated accuracy of tracking
- Stable features

---

### **Milestone 13: Icon Generation & Branding**
**Goal**: Create all necessary icons and branding assets.

**Tasks**:
1. Design Clarity logo/branding
2. Generate extension icons (16x16, 32x32, 48x48, 128x128)
3. Create fallback website icon for missing favicons
4. Design feature icons for navigation cards
5. Export all assets in required formats
6. Update manifest with icon paths

**Deliverables**:
- Complete icon set
- Clarity branding
- Fallback website icon

---

### **Milestone 14: Final Build & Documentation**
**Goal**: Prepare for production deployment.

**Tasks**:
1. Create production build
2. Test production build in Chrome
3. Write README.md with:
   - Installation instructions
   - Features overview
   - Usage guide
4. Add inline code comments for maintainability
5. Create extension screenshots for store listing
6. Package extension for distribution

**Deliverables**:
- Production-ready build
- Complete documentation
- Packaged extension (.crx or .zip)

---

## Development Guidelines

### Code Quality
- Follow DRY and SOLID principles
- Write modular, reusable components
- Use TypeScript strictly (no `any` types)
- Implement proper error handling
- Add meaningful comments for complex logic

### Performance
- Use React 19 features (use hook, useMemo, etc.)
- Implement code splitting
- Lazy load routes/screens
- Optimize re-renders
- Minimize IndexedDB queries

### Design
- Strictly dark mode
- Black and white with green accents
- No card components (full-width screens)
- Extension width: 400px (typical popup width)
- Use Shadcn components where possible
- Use Tabler Icons exclusively

### Data Management
- All data in IndexedDB
- No external API calls
- Offline-first architecture
- Efficient data queries
- Proper data validation

---

## Execution Strategy

Each milestone will be completed in sequence. Progress will be tracked and verified before moving to the next milestone. Testing will be performed after each milestone to ensure stability.

**Current Status**: Ready to begin Milestone 1

---

**Created**: 2026-02-15  
**Version**: 1.0
