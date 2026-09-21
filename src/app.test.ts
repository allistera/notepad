import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.ts";
import { loadNote, saveNote } from "./storage.ts";

function mount(download = vi.fn()) {
	const root = document.createElement("div");
	document.body.append(root);
	createApp(root, { download });
	const editor = root.querySelector<HTMLTextAreaElement>("textarea");
	const preview = root.querySelector<HTMLElement>("[data-preview]");
	const button = (name: string) =>
		root.querySelector<HTMLButtonElement>(`button[data-action="${name}"]`);
	if (!editor || !preview) {
		throw new Error("app did not render editor and preview");
	}
	return { root, editor, preview, button, download };
}

function type(editor: HTMLTextAreaElement, value: string) {
	editor.value = value;
	editor.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("createApp", () => {
	beforeEach(() => {
		localStorage.clear();
		document.body.innerHTML = "";
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("focuses the editor on mount", () => {
		const { editor } = mount();
		expect(document.activeElement).toBe(editor);
	});

	it("loads the saved note into the editor", () => {
		saveNote("saved text");
		const { editor } = mount();
		expect(editor.value).toBe("saved text");
	});

	it("autosaves two seconds after the last keystroke", () => {
		const { editor } = mount();
		type(editor, "draft");
		vi.advanceTimersByTime(1999);
		expect(loadNote()).toBe("");
		vi.advanceTimersByTime(1);
		expect(loadNote()).toBe("draft");
	});

	it("shows the editor and hides the preview by default", () => {
		const { editor, preview, button } = mount();
		expect(editor.hidden).toBe(false);
		expect(preview.hidden).toBe(true);
		expect(button("edit")?.getAttribute("aria-pressed")).toBe("true");
		expect(button("preview")?.getAttribute("aria-pressed")).toBe("false");
	});

	it("renders markdown when switching to preview", () => {
		const { editor, preview, button } = mount();
		type(editor, "# Hello");
		button("preview")?.click();
		expect(editor.hidden).toBe(true);
		expect(preview.hidden).toBe(false);
		expect(preview.innerHTML).toContain("<h1>Hello</h1>");
		expect(button("preview")?.getAttribute("aria-pressed")).toBe("true");
	});

	it("saves immediately when switching to preview", () => {
		const { editor, button } = mount();
		type(editor, "unsaved");
		button("preview")?.click();
		expect(loadNote()).toBe("unsaved");
	});

	it("returns to the editor and refocuses it", () => {
		const { editor, preview, button } = mount();
		button("preview")?.click();
		button("edit")?.click();
		expect(editor.hidden).toBe(false);
		expect(preview.hidden).toBe(true);
		expect(document.activeElement).toBe(editor);
	});

	it("clears the editor and the saved note", () => {
		saveNote("old");
		const { editor, button } = mount();
		button("clear")?.click();
		expect(editor.value).toBe("");
		expect(loadNote()).toBe("");
		vi.advanceTimersByTime(2000);
		expect(loadNote()).toBe("");
	});

	it("downloads the note as a .txt file", () => {
		const { editor, button, download } = mount();
		type(editor, "plain");
		button("download-txt")?.click();
		expect(download).toHaveBeenCalledWith("note.txt", "plain", "text/plain");
	});

	it("downloads the note as a .md file", () => {
		const { editor, button, download } = mount();
		type(editor, "# md");
		button("download-md")?.click();
		expect(download).toHaveBeenCalledWith("note.md", "# md", "text/markdown");
	});
});
