# Notepad

A full-screen, single-note text editor that lives entirely in the browser.
Text is saved to `localStorage` two seconds after you stop typing, and again
when you switch to Preview or leave the page.

## Features

- Editor is focused as soon as the page loads.
- Edit / Preview toggle: raw text by default, rendered Markdown on demand.
- Clear the note, or download it as `note.txt` or `note.md`.
- Light and dark colour schemes follow the operating system.

## Stack

- [Vite](https://vite.dev) + TypeScript, no UI framework (plain DOM APIs).
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
