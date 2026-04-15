# Web Deployment Guide

For Git remote setup and which repository/branch deploys each environment, use [`deployment-targets.md`](./deployment-targets.md) as the source of truth. Remote configuration is local to each clone, so every new PC should run `.\scripts\setup-git-remotes.ps1` once after cloning.

## Why the white screen happened

The source `index.html` in the repository points to the Vite development entry:

```html
<script type="module" src="/src/main.tsx"></script>
```

That file works only when the Vite dev server is running. If the repository root is uploaded directly to the production web server, the browser requests `/src/main.tsx` and the server usually responds with HTML instead of JavaScript, which causes the blank page and MIME type error.

## Correct deployment target

Always deploy the contents of the `dist` folder created by:

```bash
npm run build
```

Do not deploy the repository root `index.html`, `src`, or other source files as the public web root.

## Recommended deployment steps

1. In the project root, install dependencies once:

   ```bash
   npm install
   ```

2. Build the production bundle:

   ```bash
   npm run build
   ```

3. Upload only the files inside `dist/` to the production web root.
4. Make sure the deployed web root contains:
   - `index.html`
   - `assets/*`
5. After upload, hard-refresh the browser or clear the CDN/server cache if one is in front of the site.

## Routing note

This app uses `createHashRouter`, so routes are served after `#` in the URL. Because of that, the web server does not need SPA rewrite rules for application pages.

## Path compatibility

The Vite config uses a relative `base` path so the build works both:

- at the domain root, such as `https://dknh-sys.co.kr/`
- under a subdirectory, such as `https://example.com/dknh/`

## Server checklist

- The web root points to the built files from `dist/`
- `.tsx` source files are never exposed as public assets
- `index.html` is served as HTML
- `assets/*.js` is served as JavaScript
- `assets/*.css` is served as CSS

## Quick verification after deployment

1. Open the site.
2. Open DevTools Network tab.
3. Confirm the first script request is something like `assets/index-xxxxx.js`, not `/src/main.tsx`.
4. Confirm the script response has a JavaScript content type and returns JS content, not an HTML error page.
