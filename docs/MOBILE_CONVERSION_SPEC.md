# Tranche — Mobile / iOS Conversion Spec

## 1. Executive Summary

Tranche is a single-page stock allocation tool built with **Next.js 14 (App Router), React 18, TypeScript, Zustand, and Tailwind CSS**. It lets users set a dollar budget, add stock positions by ticker, fetch live prices from Yahoo Finance, adjust share counts, and view allocation percentages. All state persists to `localStorage`.

This spec evaluates three paths for bringing Tranche to mobile / iOS and provides a recommended approach with a detailed migration plan.

---

## 2. Current Architecture Inventory

### 2.1 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2.5 (App Router) |
| Language | TypeScript 5, React 18 |
| State | Zustand 5 with `persist` middleware → `localStorage` |
| Styling | Tailwind CSS 3.4, shadcn/ui primitives (Button, Input, Progress, Skeleton, Sonner) |
| Fonts | IBM Plex Sans (`--font-ui`), JetBrains Mono (`--font-mono`) via `next/font/google` |
| API layer | Next.js Route Handlers (`/api/price`, `/api/perf`) |
| External data | Yahoo Finance Chart API (`query1.finance.yahoo.com/v8/finance/chart`) |
| IDs | `nanoid` |

### 2.2 Application Features

| Feature | Description |
|---------|-------------|
| **Budget editor** | Inline-editable dollar amount; Enter to commit, Escape to cancel |
| **Summary bar** | Allocated vs remaining totals, color-coded progress bar (green → amber → red) |
| **Positions table** | Ticker input, name/price display (with loading skeletons and error states), share count (+/- with Shift ×10 / Ctrl ×100 modifiers), row total, % of budget, remove row |
| **Price quotes** | Client fetches `/api/price?ticker=…` after ticker input; race-condition safe via sequence refs |
| **Performance popover** | Hover-triggered; fetches `/api/perf?ticker=…` for 1W / 3M / YTD / 1Y % changes displayed with colored bars |
| **Share URL** | Builds `?b=…&s=TICK:shares,…` query string, copies to clipboard via `navigator.clipboard`; reads URL state on load |
| **Persistence** | Zustand `persist` → `localStorage` with key `tranche-session`; persists `budget` and `positions` |
| **Theme** | Dark-only, CSS custom properties for shadcn tokens |

### 2.3 Server-Side Dependencies

The app has **two server-side API routes** that act as a proxy to Yahoo Finance:

- **`/api/price`** — fetches `range: "1d"` chart data, returns `{ ticker, name, price, changePct1D }`. Sets `Cache-Control: s-maxage=60`.
- **`/api/perf`** — fetches `range: "1y"` chart data, computes 1W/3M/YTD/1Y % changes from closing prices. Sets `Cache-Control: s-maxage=3600`.

Both routes use `lib/server/yahoo.ts` which sends requests with a custom `User-Agent` header. This proxy pattern exists because Yahoo Finance's API does not support CORS for browser-direct calls.

### 2.4 Complexity Assessment

- **Small surface area**: 1 page, 5 UI components (shadcn primitives), 1 store file, 2 API routes, 1 server utility.
- **No authentication / user accounts**.
- **No database** — all persistence is client-side `localStorage`.
- **No SSR-dependent rendering** — the page is `"use client"` and could run as a fully static SPA with an external API.

---

## 3. Approach Evaluation

### 3.1 Option A — Flutter (Full Rewrite)

**What it is:** Rewrite the entire UI in Dart using Flutter's widget system, targeting iOS (and optionally Android).

| Aspect | Assessment |
|--------|-----------|
| **Code reuse** | Near zero. All React components, Zustand store, Tailwind styles, and shadcn primitives must be rewritten in Dart. |
| **Native feel** | Excellent. Flutter compiles to native ARM code; smooth 60/120 fps, native gestures, Cupertino or Material widgets. |
| **API routes** | Cannot run Next.js Route Handlers in Flutter. Must either: (a) deploy the API proxy as a standalone service, or (b) call Yahoo Finance directly from the app (requires handling CORS-equivalent issues and User-Agent headers at the HTTP client level). |
| **State management** | Rewrite Zustand store using Riverpod, Bloc, or Provider. Persistence via `shared_preferences` or `hive`. |
| **Effort** | High. Equivalent to building the app from scratch in a different language. |
| **Maintenance** | Two completely separate codebases (web + mobile) to maintain. |
| **App Store** | Full native binary; straightforward App Store submission. |

**When to choose:** If the goal is a premium, platform-native iOS experience and the team has Dart/Flutter expertise, or plans to abandon the web version.

### 3.2 Option B — Electron

**What it is:** Package the Next.js app as a desktop application using Electron (Chromium + Node.js).

| Aspect | Assessment |
|--------|-----------|
| **Code reuse** | Very high. Existing codebase runs nearly as-is inside Electron's Chromium renderer. Next.js API routes can run in the main process or as a local server. |
| **Mobile / iOS** | **Electron does not target iOS or Android.** It produces macOS, Windows, and Linux desktop apps only. This option does **not** solve the mobile requirement. |
| **Effort** | Low for desktop; adds `electron`, `electron-builder`, main process bootstrap. |

**When to choose:** Only if the actual goal is a **desktop** app (macOS/Windows), not mobile/iOS. Can complement a mobile strategy but does not replace it.

### 3.3 Option C — Capacitor (Recommended for iOS with Minimal Effort)

**What it is:** Use [Capacitor](https://capacitorjs.com/) (by the Ionic team) to wrap the existing Next.js web app in a native iOS WebView shell, with access to native APIs via plugins.

| Aspect | Assessment |
|--------|-----------|
| **Code reuse** | ~95%. The existing React/Tailwind UI runs in a WKWebView. Only native-bridge touches (storage, clipboard, share sheet, haptics) require Capacitor plugin calls. |
| **API routes** | Export the Next.js app as a static SPA (`output: 'export'`) and deploy the API proxy separately (e.g., Vercel serverless, Cloudflare Worker, or a lightweight Express/Hono server). Alternatively, make Yahoo Finance calls directly from the app using Capacitor's native HTTP plugin (bypasses CORS). |
| **State management** | Zustand store works unchanged. Swap `localStorage` for Capacitor `Preferences` plugin for more reliable native storage (optional; `localStorage` works in WKWebView). |
| **Styling** | Tailwind works as-is. Add safe-area insets (`env(safe-area-inset-*)`) and touch-optimized tap targets. |
| **Native features** | Capacitor plugins for: Haptics, Share (native sheet instead of clipboard), Status Bar, Splash Screen, App (lifecycle events). |
| **Effort** | Low-to-medium. Primary work is (1) extracting the API proxy, (2) adapting interactions for touch, (3) adding safe-area handling, (4) configuring Xcode project. |
| **App Store** | Produces a real `.ipa`; submittable to App Store (Apple allows WKWebView apps as long as they provide sufficient native value). |

**When to choose:** Best balance of effort vs result when the team is already invested in the React/TypeScript stack and wants to ship quickly.

### 3.4 Option D — React Native / Expo (Alternative Native Path)

**What it is:** Rewrite the UI using React Native components while sharing business logic (store, API calls, types) from the existing codebase.

| Aspect | Assessment |
|--------|-----------|
| **Code reuse** | ~40-50%. TypeScript types, Zustand store logic, and utility functions can be shared. All JSX/HTML/Tailwind must be rewritten with React Native primitives (`View`, `Text`, `FlatList`, etc.). |
| **Native feel** | Very good. React Native renders actual native views; supports native navigation, gestures, and platform conventions. |
| **API routes** | Same as Capacitor — deploy proxy separately or call Yahoo Finance directly (no CORS in React Native). |
| **Effort** | Medium. Less than Flutter (same language, some code sharing) but more than Capacitor (full UI rewrite). |
| **App Store** | Native binary; straightforward submission. |

**When to choose:** If a truly native UI is desired and the team wants to stay in TypeScript/React rather than learning Dart.

---

## 4. Recommendation

**Primary recommendation: Capacitor (Option C)** for the fastest path to an iOS app with the highest code reuse.

**Secondary recommendation: React Native / Expo (Option D)** if the team determines that a WebView-based app does not meet performance or UX standards after prototyping.

**Electron (Option B)** should be pursued only as a separate desktop initiative, not as a mobile solution.

**Flutter (Option A)** is a strong choice only if the team plans a broader multi-platform strategy and is willing to invest in a full rewrite.

---

## 5. Detailed Migration Plan — Capacitor Path

### Phase 1: Decouple the API Proxy

**Goal:** Make the client-side app independent of Next.js server-side Route Handlers.

#### 1a. Extract API Proxy to a Standalone Service

Create a lightweight API service (e.g., Hono on Cloudflare Workers, or Express on any Node host) that replicates the two routes:

```
POST/GET /api/price?ticker=AAPL  →  Yahoo Finance chart (1d)
POST/GET /api/perf?ticker=AAPL   →  Yahoo Finance chart (1y)
```

Files to extract:
- `lib/server/yahoo.ts` → core fetch logic
- `lib/constants/yahoo.ts` → base URL and user-agent
- `app/api/price/route.ts` → price endpoint logic
- `app/api/perf/route.ts` → perf endpoint logic

The proxy should:
- Preserve the same JSON response shapes
- Set appropriate CORS headers (`Access-Control-Allow-Origin`) for the web version
- Maintain cache headers for CDN/edge caching
- Be deployable independently (Vercel serverless function, Cloudflare Worker, Fly.io, etc.)

#### 1b. Alternative: Direct Yahoo Finance Calls via Capacitor HTTP

Capacitor's `@capacitor/http` plugin makes native HTTP requests that bypass CORS. The mobile app could call Yahoo Finance directly:

```typescript
import { CapacitorHttp } from '@capacitor/core';

const response = await CapacitorHttp.get({
  url: `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
  headers: { 'User-Agent': YAHOO_FINANCE_USER_AGENT },
});
```

**Trade-off:** Simpler architecture (no proxy needed for mobile), but the web version still needs the proxy for CORS. Use an environment-aware fetch wrapper:

```typescript
async function fetchQuote(ticker: string, range: string) {
  if (Capacitor.isNativePlatform()) {
    return fetchDirectFromYahoo(ticker, range);
  }
  return fetch(`${API_BASE_URL}/api/price?ticker=${ticker}`);
}
```

#### 1c. Update Client Fetch Calls

Replace hardcoded `/api/price` and `/api/perf` paths with a configurable base URL:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

// In fetchPrice:
const response = await fetch(`${API_BASE}/api/price?ticker=${encodeURIComponent(ticker)}`);

// In fetchPerf:
const response = await fetch(`${API_BASE}/api/perf?ticker=${encodeURIComponent(ticker)}`);
```

### Phase 2: Convert to Static Export

**Goal:** Produce a static SPA bundle that Capacitor can load from disk.

#### 2a. Configure Next.js Static Export

In `next.config.mjs`:

```javascript
const nextConfig = {
  output: 'export',
  // Remove the headers() function (not supported in static export)
};
```

Since the entire app is `"use client"` with no SSR data fetching, static export should work without changes to the page component.

#### 2b. Verify the Build

```bash
npm run build
# Produces `out/` directory with index.html + JS/CSS bundles
```

Confirm the SPA loads correctly by serving `out/` locally:

```bash
npx serve out
```

### Phase 3: Add Capacitor

#### 3a. Install and Initialize

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Tranche" "com.tranche.app" --web-dir out

npm install @capacitor/ios
npx cap add ios
```

This creates:
- `capacitor.config.ts` — Capacitor configuration
- `ios/` — Xcode project

#### 3b. Configure `capacitor.config.ts`

```typescript
import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.tranche.app',
  appName: 'Tranche',
  webDir: 'out',
  server: {
    // For development: proxy to local Next.js dev server
    // url: 'http://localhost:3000',
    // cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#09090b',
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#09090b',
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#09090b',
    },
  },
};

export default config;
```

#### 3c. Build and Sync Workflow

```bash
npm run build          # Next.js static export → out/
npx cap sync ios       # Copy web assets + sync native plugins
npx cap open ios       # Open Xcode project
```

### Phase 4: Mobile UX Adaptations

#### 4a. Safe Area Insets

Add safe-area padding to the root layout to respect iOS notch and home indicator:

```css
/* In globals.css */
main {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

Set the viewport meta tag for proper mobile rendering:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

#### 4b. Touch Interaction Overhaul

| Current (Desktop) | Mobile Adaptation |
|-------------------|-------------------|
| Hover popover for performance data | Tap to toggle popover; tap outside to dismiss |
| Mouse hover delays (180ms open, 130ms close) | Immediate open on tap; swipe-to-dismiss or tap-outside |
| Shift/Ctrl+click for ×10/×100 share increment | Long-press for ×10; add a dedicated "step size" toggle or slider |
| `navigator.clipboard.writeText()` | Use Capacitor `Share` plugin for native share sheet |
| Inline budget edit on click | Same pattern works on tap; ensure keyboard type is `decimal-pad` |

#### 4c. Responsive Layout Changes

The current positions grid uses a fixed 6-column layout:

```
grid-cols-[88px_minmax(280px,1fr)_148px_112px_88px_36px]
```

For mobile (< 640px), switch to a stacked card layout:

```
┌─────────────────────────────┐
│  AAPL              ×  Remove│
│  Apple Inc. — $213.25 +1.2% │
│  ┌──┐ ┌────────┐ ┌──┐      │
│  │ -│ │   15   │ │ +│      │
│  └──┘ └────────┘ └──┘      │
│  Total: $3,198.75    14.8%  │
└─────────────────────────────┘
```

Use Tailwind breakpoints (`sm:grid-cols-[...]` for desktop, stacked `flex-col` for mobile).

#### 4d. Performance Popover → Bottom Sheet

Replace the hover-positioned popover with a bottom sheet / modal drawer on mobile:

- Tap the price/name area to open a slide-up sheet showing performance data
- Swipe down or tap backdrop to dismiss
- Can use a lightweight library like `vaul` (already React-compatible) or build with CSS transforms

#### 4e. Native Feature Integrations

| Feature | Plugin | Implementation |
|---------|--------|---------------|
| **Share** | `@capacitor/share` | Replace `navigator.clipboard.writeText` with `Share.share({ url })` for native share sheet |
| **Haptics** | `@capacitor/haptics` | Light impact on share +/- button presses; notification on budget exceeded |
| **Status Bar** | `@capacitor/status-bar` | Set light content, transparent background to match dark theme |
| **Splash Screen** | `@capacitor/splash-screen` | Dark background (#09090b) with Tranche logo |
| **Keyboard** | `@capacitor/keyboard` | Listen for keyboard show/hide to adjust layout when editing budget/shares |
| **Preferences** | `@capacitor/preferences` | Optional replacement for `localStorage`; more reliable on iOS |

### Phase 5: Persistence Adaptation

The current Zustand persistence uses `localStorage` via `createJSONStorage(() => localStorage)`. In a Capacitor WKWebView, `localStorage` works but may be cleared by iOS under storage pressure.

For more robust persistence, create a Capacitor-aware storage adapter:

```typescript
import { Preferences } from '@capacitor/preferences';
import type { StateStorage } from 'zustand/middleware';

const capacitorStorage: StateStorage = {
  getItem: async (name: string) => {
    const { value } = await Preferences.get({ key: name });
    return value;
  },
  setItem: async (name: string, value: string) => {
    await Preferences.set({ key: name, value });
  },
  removeItem: async (name: string) => {
    await Preferences.remove({ key: name });
  },
};
```

Update the store:

```typescript
import { Capacitor } from '@capacitor/core';

const storage = Capacitor.isNativePlatform()
  ? createJSONStorage(() => capacitorStorage)
  : createJSONStorage(() => localStorage);
```

### Phase 6: App Store Preparation

#### 6a. App Icons and Splash Screens

Generate all required iOS icon sizes from a 1024×1024 source image. Use `@capacitor/assets` to auto-generate:

```bash
npx @capacitor/assets generate --ios
```

#### 6b. App Store Metadata

- **Bundle ID:** `com.tranche.app`
- **Display Name:** Tranche
- **Category:** Finance
- **Description:** Stock allocation tool — set a budget, add positions, and visualize your portfolio allocation.
- **Keywords:** stocks, portfolio, allocation, shares, budget, investment
- **Privacy Policy:** Required for finance-category apps. The app collects no user data; all data is stored on-device.

#### 6c. iOS-Specific Configuration (`ios/App/App/Info.plist`)

- `ITSAppUsesNonExemptEncryption` → `NO` (no custom encryption)
- `NSAppTransportSecurity` — allow Yahoo Finance domain if calling directly
- `UIStatusBarStyle` → `UIStatusBarStyleLightContent`

#### 6d. Review Guidelines Considerations

Apple requires WKWebView-based apps to provide "sufficient native functionality." Mitigation:
- Use native Share sheet instead of clipboard
- Add haptic feedback
- Implement native splash screen
- Ensure proper safe-area and Dynamic Type support
- Consider adding a simple native settings screen or widget in a future iteration

---

## 6. Detailed Migration Plan — React Native Alternative

If the Capacitor prototype does not meet quality standards, the React Native path involves:

### Shareable Code (~40-50%)

| Artifact | Reusable? |
|----------|-----------|
| `lib/store.ts` (Zustand store) | Yes — Zustand works in React Native. Replace `localStorage` with `@react-native-async-storage/async-storage`. |
| `lib/utils.ts` (`cn()`, `isNumber()`) | Partially — `cn()` (Tailwind merge) is not needed; `isNumber()` is reusable. |
| `lib/constants/yahoo.ts` | Yes |
| `lib/server/yahoo.ts` | Yes — HTTP calls work directly from React Native (no CORS). |
| TypeScript types (`Position`, `PositionPerf`, `Store`) | Yes |
| `Intl.NumberFormat` formatters | Yes |
| URL parse/build logic | Yes |

### Must Rewrite

| Artifact | React Native Equivalent |
|----------|------------------------|
| `app/page.tsx` (626 lines of JSX) | Rewrite with `View`, `Text`, `TextInput`, `Pressable`, `FlatList`, `ScrollView` |
| `components/ui/*` (shadcn primitives) | Replace with React Native Paper, NativeBase, or custom components |
| Tailwind CSS classes | Use `StyleSheet.create()`, NativeWind, or Tamagui |
| Performance popover | React Native bottom sheet (`@gorhom/bottom-sheet`) |
| `next/font/google` | `expo-font` with downloaded font files |
| Sonner toasts | `react-native-toast-message` or `burnt` |
| `navigator.clipboard` | `react-native-share` |

### React Native Project Setup

```bash
npx create-expo-app tranche-mobile --template blank-typescript
cd tranche-mobile
npx expo install zustand @react-native-async-storage/async-storage
npx expo install expo-haptics expo-font expo-splash-screen
npx expo install react-native-share @gorhom/bottom-sheet
```

---

## 7. Detailed Migration Plan — Electron (Desktop Only)

For completeness, if a desktop app is also desired alongside mobile:

### Setup

```bash
npm install --save-dev electron electron-builder concurrently wait-on
```

### Architecture

- **Main process:** Starts a local Next.js server on a random port, then opens a `BrowserWindow` pointed at `http://localhost:<port>`.
- **Alternative:** Use `output: 'export'` and load `out/index.html` via `file://` protocol; deploy API proxy separately (same as Capacitor approach).
- **Preload script:** Expose `ipcRenderer` for native menu actions (e.g., File → New Allocation, Edit → Reset Budget).

### Limitations

- **Not suitable for iOS/mobile** — Electron targets macOS, Windows, Linux only.
- **Large binary size** (~150-200MB due to bundled Chromium).
- **No App Store for iOS** — only Mac App Store submission is possible.

---

## 8. Development Workflow

### Recommended Scripts (Capacitor Path)

Add to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:mobile": "next build && npx cap sync ios",
    "ios": "npx cap open ios",
    "ios:run": "npx cap run ios",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### Development Cycle

1. **Web development:** `npm run dev` — standard Next.js dev server
2. **Mobile preview:** `npm run build:mobile && npm run ios:run` — builds static, syncs, and runs on iOS simulator
3. **Live reload on device (dev):** Set `server.url` in `capacitor.config.ts` to point to the dev machine's IP; run `npm run dev` and `npx cap run ios`
4. **Production build:** `npm run build:mobile` → open Xcode → Archive → Upload to App Store Connect

### Testing Strategy

| Layer | Tool |
|-------|------|
| Unit tests (store logic) | Vitest or Jest |
| Component tests | React Testing Library |
| E2E (web) | Playwright |
| E2E (mobile) | Detox (React Native) or Appium (Capacitor) |
| Manual | iOS Simulator via Xcode, TestFlight for real devices |

---

## 9. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Apple rejects WKWebView app for "not enough native functionality" | Medium | Add native plugins (Share, Haptics, Splash); ensure responsive design meets HIG; add native settings if needed |
| Yahoo Finance API changes or blocks mobile User-Agent | Medium | Proxy all requests through the API service; abstract the data source behind an interface for easy provider swap |
| `localStorage` data loss on iOS | Low | Migrate to Capacitor `Preferences` plugin for reliable native key-value storage |
| Performance: large position lists in WebView | Low | The app is lightweight; typical usage is < 50 positions. Virtualize with `react-window` if needed |
| Offline support | Low (future) | Current app requires network for price quotes. Add a "last fetched" timestamp and display cached data when offline |

---

## 10. Future Enhancements (Post-Launch)

| Enhancement | Description |
|-------------|-------------|
| **Push notifications** | Alert when a position hits a target price (requires a backend scheduler) |
| **Widgets** | iOS home screen widget showing portfolio summary (requires native Swift widget extension) |
| **Biometric lock** | Face ID / Touch ID via `@capacitor/biometrics` to protect portfolio data |
| **Watchlist** | Separate view for tracking tickers without allocating budget |
| **Multiple portfolios** | Tab-based or drawer navigation for managing multiple allocation scenarios |
| **Android** | Capacitor supports Android with the same web assets; add `npx cap add android` |
| **Dark/Light theme** | Respect iOS system appearance via `prefers-color-scheme` media query |
| **Offline mode** | Cache last-known prices; show staleness indicator |

---

## 11. Summary Decision Matrix

| Criteria | Capacitor | React Native | Flutter | Electron |
|----------|-----------|-------------|---------|----------|
| **Code reuse** | ~95% | ~45% | ~0% | ~98% |
| **iOS support** | Yes | Yes | Yes | No |
| **Android support** | Yes | Yes | Yes | No |
| **Desktop support** | No | Limited | Yes (desktop target) | Yes |
| **Native UX quality** | Good (WebView) | Very good | Excellent | N/A (desktop) |
| **Time to first build** | Days | Weeks | Weeks | Days |
| **Maintenance burden** | Low (single codebase) | Medium (shared logic, separate UI) | High (separate codebase) | Low (single codebase) |
| **App Store risk** | Medium (WKWebView policy) | Low | Low | N/A (no iOS) |
| **Team skill required** | Existing (React/TS) | Existing (React/TS) + RN specifics | New (Dart) | Existing (React/TS) |

**Recommended path: Capacitor for iOS** — maximizes code reuse, minimizes time-to-ship, and keeps the team in the React/TypeScript ecosystem. Evaluate React Native if the WebView approach proves insufficient after prototyping.
