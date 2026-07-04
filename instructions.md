# Project Structure & Deployment Guide

This document outlines the standard project structure for this suite of games and provides step-by-step instructions on configuring the build pipeline, setting subpath deployment bases, and purging Vertex AI or Google AI Studio related configurations.

---

## 1. Project Directory Structure

```
├── .github/
│   └── workflows/
│       └── build.yml               # GitHub Actions pipeline for building and uploading artifacts
├── components/
│   ├── Board.tsx                   # Renders the Chess board and squares
│   ├── CapturedPieces.tsx          # Displays captured pieces for both sides
│   ├── MoveHistory.tsx             # Lists the moves made in the game
│   └── Square.tsx                  # Renders individual board squares and pieces
├── services/
│   └── engine.ts                   # MiniMax chess engine for player vs computer mode
├── App.tsx                         # Main container layout, game state management, and sidebars
├── constants.ts                    # Board themes, piece styles, and image assets
├── index.html                      # Entry HTML file importing Tailwind CDN & Inter font
├── index.tsx                       # App mounting point (React root entry point)
├── package.json                    # Dependencies, scripts, and build metadata
├── types.ts                        # Shared type definitions (Square, Move, Color, etc.)
└── vite.config.ts                  # Vite build and path configuration
```

---

## 2. Guide to Common Changes & Maintenance

When creating a new game or adapting an existing one, verify that the following configurations are set correctly:

### A. Build Pipeline & Artifact Generation
Ensure that `.github/workflows/build.yml` compiles the code cleanly and publishes the build output as a GitHub artifact so it can be deployed to your hosting servers.

*   **Install Command:** Run `npm ci` to install exact dependency versions from `package-lock.json`.
*   **Build Command:** Avoid concurrent background installs (e.g., `npm install & npm run build` is invalid). Run `npm run build` directly.
*   **Upload Artifacts:** Use `actions/upload-artifact@v4` pointing to the `dist` directory.

**Workflow Template (`.github/workflows/build.yml`):**
```yaml
name: Build Project

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run build
        run: npm run build

      - name: Upload Build Artifact
        uses: actions/upload-artifact@v4
        with:
          name: build-artifact
          path: dist
```

### B. Subpath / Subfolder Deployment Base
If a game is hosted under a domain subpath (such as `prezento.am/games/chess/`), absolute references like `/assets/...` will fail with a 404 error because they point to the root domain. 

To resolve this, set the `base` property in `vite.config.ts` to match the target subpath:
```typescript
// vite.config.ts
export default defineConfig(({ mode }) => {
  return {
    base: '/games/chess/', // Change to the correct subfolder path (with leading and trailing slashes)
    // ...other config
  };
});
```

### C. Removing Vertex AI & Google AI Studio Code
If you are converting an AI-integrated template to a clean static deployment, remove all remnants of Vertex/Google AI Studio:

1.  **Delete the Proxy Shim File:**
    ```bash
    rm vertex-ai-proxy-interceptor.js
    ```
2.  **Remove Entry File Import:** 
    Open `index.tsx` and delete the interceptor import line at the top:
    ```typescript
    // REMOVE THIS LINE:
    import './vertex-ai-proxy-interceptor.js';
    ```
3.  **Clean up `index.html`:**
    Remove any defunct script tags referencing local proxy JS entrypoints (e.g. `<script type="module" src="/index.js"></script>`).
4.  **Clean up `vite.config.ts`:**
    Remove `define` (specifically `process.env.API_KEY`) and `server.proxy` configurations targeting `/api-proxy` or `/ws-proxy`, keeping the config simple and standard:
    ```typescript
    import path from 'path';
    import { defineConfig, loadEnv } from 'vite';
    import react from '@vitejs/plugin-react';

    export default defineConfig(({ mode }) => {
        return {
          base: '/games/chess/',
          plugins: [react()],
          resolve: {
            alias: {
              '@': path.resolve(__dirname, '.'),
            }
          },
          build: {
            outDir: 'dist',
            emptyOutDir: true,
          }
        };
    });
    ```