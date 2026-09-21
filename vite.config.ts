/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
	// Served from https://allistera.github.io/notepad/ on GitHub Pages.
	base: "/notepad/",
	test: {
		environment: "jsdom",
	},
});
