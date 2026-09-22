import { EditorView } from "@codemirror/view";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type AppDependencies,
	AUTOSAVE_DELAY_MS,
	AUTOSAVE_MAX_WAIT_MS,
	createApp,
} from "./app.ts";
import { DETECT_DELAY_MS } from "./editor.ts";
import { loadNote, STORAGE_KEY, saveNote } from "./storage.ts";

const disposers: Array<() => void> = [];

function mount(deps: AppDependencies = {}) {
	const download = vi.fn();
	const root = document.createElement("div");
	document.body.append(root);
	disposers.push(createApp(root, { download, ...deps }));
	const editorDom = root.querySelector<HTMLElement>(".cm-editor");
	const content = root.querySelector<HTMLElement>(".cm-content");
	const preview = root.querySelector<HTMLElement>("[data-preview]");
	const status = root.querySelector<HTMLElement>("[data-status]");
	const view = editorDom ? EditorView.findFromDOM(editorDom) : null;
	const button = (name: string) =>
		root.querySelector<HTMLButtonElement>(`button[data-action="${name}"]`);
	if (!editorDom || !content || !preview || !status || !view) {
		throw new Error("app did not render editor, preview and status");
	}
	const editor = {
		getValue: () => view.state.doc.toString(),
	};
	return {
		root,
		editor,
		editorDom,
		content,
		preview,
		status,
		button,
		download,
		view,
	};
}

function type(view: EditorView, value: string) {
	view.dispatch({
		changes: { from: 0, to: view.state.doc.length, insert: value },
	});
}

function append(view: EditorView, value: string) {
	view.dispatch({
		changes: { from: view.state.doc.length, insert: value },
	});
}

function otherTabSaves(value: string | null) {
	if (value === null) {
		localStorage.removeItem(STORAGE_KEY);
	} else {
		localStorage.setItem(STORAGE_KEY, value);
	}
	window.dispatchEvent(
		new StorageEvent("storage", { key: STORAGE_KEY, newValue: value }),
	);
}

function setVisibility(state: DocumentVisibilityState) {
	Object.defineProperty(document, "visibilityState", {
		value: state,
		configurable: true,
	});
	document.dispatchEvent(new Event("visibilitychange"));
}

describe("createApp", () => {
	beforeEach(() => {
		localStorage.clear();
		document.body.innerHTML = "";
		vi.useFakeTimers();
	});

	afterEach(() => {
		for (const dispose of disposers.splice(0)) {
			dispose();
		}
		vi.useRealTimers();
		vi.restoreAllMocks();
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
		const { view } = mount();
		type(view, "draft");
		vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 1);
		expect(loadNote()).toBe("");
		vi.advanceTimersByTime(1);
		expect(loadNote()).toBe("draft");
	});

	it("saves at least once while typing continues without a pause", () => {
		const { view } = mount();
		const step = AUTOSAVE_DELAY_MS / 2;
		for (let elapsed = 0; elapsed < AUTOSAVE_MAX_WAIT_MS; elapsed += step) {
			append(view, "x");
			vi.advanceTimersByTime(step);
		}
		expect(loadNote()).not.toBe("");
	});

	it("shows the editor and hides the preview by default", () => {
		const { editorDom, preview, button } = mount();
		expect(editorDom.hidden).toBe(false);
		expect(preview.hidden).toBe(true);
		expect(button("edit")?.getAttribute("aria-pressed")).toBe("true");
		expect(button("preview")?.getAttribute("aria-pressed")).toBe("false");
	});

	it("renders markdown when switching to preview", async () => {
		const { view, editorDom, preview, button } = mount();
		type(view, "# Hello");
		button("preview")?.click();
		await vi.waitFor(() => {
			expect(preview.innerHTML).toContain("<h1>Hello</h1>");
		});
		expect(editorDom.hidden).toBe(true);
		expect(preview.hidden).toBe(false);
		expect(button("preview")?.getAttribute("aria-pressed")).toBe("true");
	});

	it("stays in edit mode if Edit is clicked before the preview has rendered", async () => {
		let resolveRenderer: (value: (source: string) => string) => void = () => {};
		const loadRenderer = () =>
			new Promise<(source: string) => string>((resolve) => {
				resolveRenderer = resolve;
			});
		const { view, editorDom, preview, button } = mount({ loadRenderer });
		type(view, "# Hello");
		button("preview")?.click();
		button("edit")?.click();
		resolveRenderer((source) => `<p>${source}</p>`);
		await Promise.resolve();
		await Promise.resolve();
		expect(editorDom.hidden).toBe(false);
		expect(preview.hidden).toBe(true);
		expect(preview.innerHTML).toBe("");
	});

	it("saves immediately when switching to preview", () => {
		const { view, button } = mount();
		type(view, "unsaved");
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
		vi.advanceTimersByTime(AUTOSAVE_MAX_WAIT_MS);
		expect(loadNote()).toBe("");
	});

	it("downloads the note as a .txt file", () => {
		const { view, button, download } = mount();
		type(view, "plain");
		button("download-txt")?.click();
		expect(download).toHaveBeenCalledWith("note.txt", "plain", "text/plain");
	});

	it("highlights Markdown syntax in the editor once it is typed", () => {
		const { root, view } = mount();
		type(view, "just prose");
		vi.advanceTimersByTime(DETECT_DELAY_MS);
		expect(root.querySelector(".md-heading")).toBeNull();
		type(view, "# A heading");
		vi.advanceTimersByTime(DETECT_DELAY_MS);
		expect(root.querySelector(".md-heading")).not.toBeNull();
	});

	it("downloads the note as a .md file", () => {
		const { view, button, download } = mount();
		type(view, "# md");
		button("download-md")?.click();
		expect(download).toHaveBeenCalledWith("note.md", "# md", "text/markdown");
	});

	describe("leaving the page", () => {
		it("saves pending edits on beforeunload", () => {
			const { view } = mount();
			type(view, "pending");
			window.dispatchEvent(new Event("beforeunload"));
			expect(loadNote()).toBe("pending");
		});

		it("saves pending edits on pagehide", () => {
			const { view } = mount();
			type(view, "pending");
			window.dispatchEvent(new Event("pagehide"));
			expect(loadNote()).toBe("pending");
		});

		it("saves pending edits when the tab is hidden", () => {
			const { view } = mount();
			type(view, "pending");
			setVisibility("hidden");
			expect(loadNote()).toBe("pending");
			setVisibility("visible");
		});

		it("does not overwrite another tab's newer note when nothing changed here", () => {
			mount();
			otherTabSaves("written by another tab");
			window.dispatchEvent(new Event("beforeunload"));
			expect(loadNote()).toBe("written by another tab");
		});
	});

	describe("other tabs", () => {
		it("shows a note saved by another tab when this editor is untouched", () => {
			const { editor } = mount();
			otherTabSaves("from tab B");
			expect(editor.getValue()).toBe("from tab B");
		});

		it("does not re-save a note received from another tab", () => {
			mount();
			otherTabSaves("from tab B");
			localStorage.setItem(STORAGE_KEY, "changed again elsewhere");
			vi.advanceTimersByTime(AUTOSAVE_MAX_WAIT_MS);
			expect(loadNote()).toBe("changed again elsewhere");
		});

		it("empties this editor when another tab clears the note", () => {
			saveNote("shared");
			const { editor } = mount();
			otherTabSaves(null);
			expect(editor.getValue()).toBe("");
		});

		it("keeps unsaved local edits over another tab's version", () => {
			const { view, editor } = mount();
			type(view, "local draft");
			otherTabSaves("from tab B");
			expect(editor.getValue()).toBe("local draft");
			vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
			expect(loadNote()).toBe("local draft");
		});
	});

	describe("save failures", () => {
		it("warns when the note cannot be saved", () => {
			vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
				throw new Error("QuotaExceededError");
			});
			const { view, status } = mount();
			type(view, "too big");
			vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
			expect(status.textContent).toMatch(/not saved/i);
		});

		it("clears the warning once a save succeeds", () => {
			const setItem = vi
				.spyOn(Storage.prototype, "setItem")
				.mockImplementation(() => {
					throw new Error("QuotaExceededError");
				});
			const { view, status } = mount();
			type(view, "first");
			vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
			expect(status.textContent).not.toBe("");
			setItem.mockRestore();
			type(view, "second");
			vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
			expect(status.textContent).toBe("");
			expect(loadNote()).toBe("second");
		});
	});

	it("stops reacting to page events after dispose", () => {
		const { view } = mount();
		type(view, "draft");
		const dispose = disposers.pop();
		dispose?.();
		window.dispatchEvent(new Event("beforeunload"));
		expect(loadNote()).toBe("");
	});
});
