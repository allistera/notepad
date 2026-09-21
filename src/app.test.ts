import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.ts";
import type { EditorHandle } from "./editor.ts";
import { loadNote, saveNote } from "./storage.ts";

function mount(download = vi.fn()) {
	const root = document.createElement("div");
	document.body.append(root);
	const { editor } = createApp(root, { download });
	const editorDom = root.querySelector<HTMLElement>(".cm-editor");
	const content = root.querySelector<HTMLElement>(".cm-content");
	const preview = root.querySelector<HTMLElement>("[data-preview]");
	const button = (name: string) =>
		root.querySelector<HTMLButtonElement>(`button[data-action="${name}"]`);
	if (!editorDom || !content || !preview) {
		throw new Error("app did not render editor and preview");
	}
	return { root, editor, editorDom, content, preview, button, download };
}

function type(editor: EditorHandle, value: string) {
	editor.setValue(value);
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
		const { content } = mount();
		expect(document.activeElement).toBe(content);
	});

	it("loads the saved note into the editor", () => {
		saveNote("saved text");
		const { editor } = mount();
		expect(editor.getValue()).toBe("saved text");
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
		const { editorDom, preview, button } = mount();
		expect(editorDom.hidden).toBe(false);
		expect(preview.hidden).toBe(true);
		expect(button("edit")?.getAttribute("aria-pressed")).toBe("true");
		expect(button("preview")?.getAttribute("aria-pressed")).toBe("false");
	});

	it("renders markdown when switching to preview", () => {
		const { editor, editorDom, preview, button } = mount();
		type(editor, "# Hello");
		button("preview")?.click();
		expect(editorDom.hidden).toBe(true);
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
		const { editorDom, content, preview, button } = mount();
		button("preview")?.click();
		button("edit")?.click();
		expect(editorDom.hidden).toBe(false);
		expect(preview.hidden).toBe(true);
		expect(document.activeElement).toBe(content);
	});

	it("clears the editor and the saved note", () => {
		saveNote("old");
		const { editor, button } = mount();
		button("clear")?.click();
		expect(editor.getValue()).toBe("");
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

	it("highlights Markdown syntax in the editor once it is typed", () => {
		const { root, editor } = mount();
		type(editor, "just prose");
		expect(root.querySelector(".md-heading")).toBeNull();
		type(editor, "# A heading");
		expect(root.querySelector(".md-heading")).not.toBeNull();
	});

	it("downloads the note as a .md file", () => {
		const { editor, button, download } = mount();
		type(editor, "# md");
		button("download-md")?.click();
		expect(download).toHaveBeenCalledWith("note.md", "# md", "text/markdown");
	});
});
