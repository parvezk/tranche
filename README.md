# Tranche

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![State: Zustand](https://img.shields.io/badge/State-Zustand-7B4B2A)](https://zustand-demo.pmnd.rs/)
[![Last commit](https://img.shields.io/github/last-commit/parvezk/tranche)](https://github.com/parvezk/tranche/commits/main)

Stock allocation tool.

Tranche is a focused, no-login stock allocation workspace for planning position sizes and validating budget impact before placing trades.
Compared with typical brokerage dashboards or ad-heavy personal finance sites, it keeps only the essentials in view:
live quote checks, per-position sizing, budget tracking, and shareable scenario URLs.

## Preview

### Screenshot

![Tranche app screenshot](docs/assets/tranche-screenshot.png)

### Quick demo video

[Download/watch demo video (WebM)](docs/assets/tranche-demo.webm)

<video controls src="docs/assets/tranche-demo.webm"></video>

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Why Zustand here?

This app could be built with React Context + reducer, but Zustand is used for:

- Simpler global state with fewer provider wrappers.
- Built-in persistence middleware for the `tranche-session` localStorage key.
- Easier selective subscriptions as the table grows, reducing unnecessary rerenders.
