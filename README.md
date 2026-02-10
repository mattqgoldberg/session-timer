# Session Timer

A simple web app that logs work sessions with categories and statistics. Data is stored in the browser’s localStorage.

## Setup

```bash
npm install
```

## Scripts

- **`npm test`** – Run the test suite once
- **`npm run test:watch`** – Run tests in watch mode
- **`npm run dev`** – Start the Vite dev server (open the app in the browser)
- **`npm run preview`** – Preview the production build

## Project structure

- **`src/core.js`** – Storage helpers, formatting, and stats logic (no DOM). All reads/writes go through localStorage. This module is fully tested.
- **`src/app.js`** – UI and event handling; imports from `core.js` and renders from localStorage.
- **`src/core.test.js`** – Vitest tests for `core.js`.
- **`index.html`** – Entry page; loads `/src/app.js` as an ES module (use `npm run dev` to serve it).
- **`style.css`** – Styles.

## Tests

Tests use [Vitest](https://vitest.dev/) with the `jsdom` environment so `localStorage` is available. Run:

```bash
npm test
```
