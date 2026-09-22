# Notepad

A full-screen, single-note text editor that lives entirely in the browser.
Text is saved to `localStorage` two seconds after you stop typing (and at
least every ten seconds while you keep typing), and again when you switch to
Preview, hide the tab or leave the page.

## Features

- Editor is focused as soon as the page loads.
- Edit / Preview toggle: raw text by default, rendered Markdown on demand.
- Markdown syntax is highlighted in the editor as soon as the text looks
  like Markdown (headings, lists, links, code, emphasis); plain prose stays
  uncoloured.
- Clear the note, or download it as `note.txt` or `note.md`.
- Open it in as many tabs as you like: a tab that has not been edited follows
  whatever another tab saves, and only a tab with unsaved edits writes back.
- If the browser refuses to save (storage full or disabled), the toolbar says
  so instead of failing silently.
- Light and dark colour schemes follow the operating system.

## Stack

- [Vite](https://vite.dev) + TypeScript, no UI framework (plain DOM APIs).
- [CodeMirror 6](https://codemirror.net) for the editor, with the
  [Lezer Markdown](https://github.com/lezer-parser/markdown) parser for highlighting.
- [marked](https://marked.js.org) renders Markdown; [DOMPurify](https://github.com/cure53/DOMPurify) sanitises the output.
- [Biome](https://biomejs.dev) for linting and formatting.
- [Vitest](https://vitest.dev) with jsdom for tests.

## Commands

```sh
npm install        # install dependencies
npm run dev        # start the dev server
npm run build      # type-check and build to dist/
npm run preview    # serve the production build
npm test           # run the test suite
npm run lint       # Biome lint + format check
npm run format     # apply Biome formatting
npm run check      # lint, build and test in one go
```

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which lints, tests,
builds and publishes `dist/` to GitHub Pages at
<https://allistera.github.io/notepad/>. The `base` option in `vite.config.ts`
matches that path; change it if the site moves.
