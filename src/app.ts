import { downloadFile } from "./download.ts";
import { createEditor } from "./editor.ts";
import type { renderMarkdown } from "./markdown.ts";
import { clearNote, loadNote, onNoteChange, saveNote } from "./storage.ts";

/** Save this long after the last keystroke. */
export const AUTOSAVE_DELAY_MS = 2000;
/** Never let unsaved edits sit longer than this, even while typing continues. */
export const AUTOSAVE_MAX_WAIT_MS = 10_000;

const SAVE_FAILED_MESSAGE =
	"Not saved: browser storage is full or unavailable. Download a copy to keep your note.";

const ICON_TRASH =
	'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

const ICON_DOWNLOAD =
	'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

const TEMPLATE = `
<header class="toolbar">
	<div class="segmented" role="group" aria-label="View mode">
		<button type="button" data-action="edit" aria-pressed="true">Edit</button>
		<button type="button" data-action="preview" aria-pressed="false">Preview</button>
	</div>
	<p class="status" data-status role="status" aria-live="polite"></p>
	<div class="actions">
		<button type="button" data-action="clear">${ICON_TRASH}<span>Clear</span></button>
		<button type="button" data-action="download-txt">${ICON_DOWNLOAD}<span>.txt</span></button>
		<button type="button" data-action="download-md">${ICON_DOWNLOAD}<span>.md</span></button>
	</div>
</header>
<main class="workspace">
	<div class="editor" data-editor></div>
	<article class="preview" data-preview hidden></article>
</main>
`;

function query<T extends Element>(root: ParentNode, selector: string): T {
	const element = root.querySelector<T>(selector);
	if (!element) {
		throw new Error(`Notepad template is missing element: ${selector}`);
	}
	return element;
}

type Renderer = typeof renderMarkdown;

// marked and DOMPurify are only needed once the user opens the preview, so
// they stay out of the initial bundle.
const loadMarkdownRenderer = (): Promise<Renderer> =>
	import("./markdown.ts").then((module) => module.renderMarkdown);

export interface AppDependencies {
	download?: typeof downloadFile;
	loadRenderer?: () => Promise<Renderer>;
}

/** Mounts the notepad into root. Returns a function that tears it down again. */
export function createApp(
	root: HTMLElement,
	{
		download = downloadFile,
		loadRenderer = loadMarkdownRenderer,
	}: AppDependencies = {},
): () => void {
	root.innerHTML = TEMPLATE;

	const editorHost = query<HTMLElement>(root, "[data-editor]");
	const preview = query<HTMLElement>(root, "[data-preview]");
	const status = query<HTMLElement>(root, "[data-status]");
	const editButton = query<HTMLButtonElement>(root, '[data-action="edit"]');
	const previewButton = query<HTMLButtonElement>(
		root,
		'[data-action="preview"]',
	);
	const clearButton = query<HTMLButtonElement>(root, '[data-action="clear"]');
	const txtButton = query<HTMLButtonElement>(
		root,
		'[data-action="download-txt"]',
	);
	const mdButton = query<HTMLButtonElement>(
		root,
		'[data-action="download-md"]',
	);

	// True while the editor holds edits that storage has not seen. Only a dirty
	// tab writes to storage, so an idle tab never clobbers another tab's note.
	let dirty = false;
	let mode: "edit" | "preview" = "edit";
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let maxWaitTimer: ReturnType<typeof setTimeout> | undefined;

	function cancelAutosave(): void {
		clearTimeout(debounceTimer);
		clearTimeout(maxWaitTimer);
		debounceTimer = undefined;
		maxWaitTimer = undefined;
	}

	function saveNow(): void {
		cancelAutosave();
		if (!dirty) {
			return;
		}
		if (saveNote(editor.getValue())) {
			dirty = false;
			status.textContent = "";
		} else {
			status.textContent = SAVE_FAILED_MESSAGE;
		}
	}

	function scheduleAutosave(): void {
		dirty = true;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(saveNow, AUTOSAVE_DELAY_MS);
		if (maxWaitTimer === undefined) {
			maxWaitTimer = setTimeout(saveNow, AUTOSAVE_MAX_WAIT_MS);
		}
	}

	function saveIfHidden(): void {
		if (document.visibilityState === "hidden") {
			saveNow();
		}
	}

	function showEditor(): void {
		mode = "edit";
		preview.hidden = true;
		editor.setHidden(false);
		editButton.setAttribute("aria-pressed", "true");
		previewButton.setAttribute("aria-pressed", "false");
		editor.focus();
	}

	async function showPreview(): Promise<void> {
		mode = "preview";
		saveNow();
		const source = editor.getValue();
		const render = await loadRenderer();
		if (mode !== "preview") {
			return;
		}
		preview.innerHTML = render(source);
		editor.setHidden(true);
		preview.hidden = false;
		editButton.setAttribute("aria-pressed", "false");
		previewButton.setAttribute("aria-pressed", "true");
	}

	function adoptRemoteNote(text: string): void {
		if (dirty) {
			return;
		}
		editor.setValue(text);
		// setValue reports a change; it came from storage, so nothing to save.
		dirty = false;
		cancelAutosave();
	}

	const editor = createEditor(editorHost, {
		doc: loadNote(),
		placeholder: "Start writing… your note saves itself as you type.",
		onChange: scheduleAutosave,
	});

	function clear(): void {
		editor.setValue("");
		cancelAutosave();
		clearNote();
		dirty = false;
		showEditor();
	}

	const downloadTxt = () =>
		download("note.txt", editor.getValue(), "text/plain");
	const downloadMd = () =>
		download("note.md", editor.getValue(), "text/markdown");

	editButton.addEventListener("click", showEditor);
	previewButton.addEventListener("click", showPreview);
	clearButton.addEventListener("click", clear);
	txtButton.addEventListener("click", downloadTxt);
	mdButton.addEventListener("click", downloadMd);
	// beforeunload does not fire on iOS Safari or when a page enters the
	// back-forward cache, so pagehide and visibilitychange cover those paths.
	window.addEventListener("beforeunload", saveNow);
	window.addEventListener("pagehide", saveNow);
	document.addEventListener("visibilitychange", saveIfHidden);
	const stopSync = onNoteChange(adoptRemoteNote);

	showEditor();

	return () => {
		cancelAutosave();
		stopSync();
		window.removeEventListener("beforeunload", saveNow);
		window.removeEventListener("pagehide", saveNow);
		document.removeEventListener("visibilitychange", saveIfHidden);
		editor.destroy();
		root.innerHTML = "";
	};
}
