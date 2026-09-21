import { downloadFile } from "./download.ts";
import { renderMarkdown } from "./markdown.ts";
import { clearNote, loadNote, saveNote } from "./storage.ts";

const AUTOSAVE_DELAY_MS = 2000;

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
	<div class="actions">
		<button type="button" data-action="clear">${ICON_TRASH}<span>Clear</span></button>
		<button type="button" data-action="download-txt">${ICON_DOWNLOAD}<span>.txt</span></button>
		<button type="button" data-action="download-md">${ICON_DOWNLOAD}<span>.md</span></button>
	</div>
</header>
<main class="workspace">
	<textarea
		class="editor"
		name="note"
		aria-label="Note"
		placeholder="Start writing… your notes auto-save every 2 seconds."
		spellcheck="true"
	></textarea>
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

export interface AppDependencies {
	download?: typeof downloadFile;
}

export function createApp(
	root: HTMLElement,
	{ download = downloadFile }: AppDependencies = {},
): void {
	root.innerHTML = TEMPLATE;

	const editor = query<HTMLTextAreaElement>(root, "textarea.editor");
	const preview = query<HTMLElement>(root, "[data-preview]");
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

	let autosaveTimer: ReturnType<typeof setTimeout> | undefined;

	function cancelAutosave(): void {
		if (autosaveTimer !== undefined) {
			clearTimeout(autosaveTimer);
			autosaveTimer = undefined;
		}
	}

	function saveNow(): void {
		cancelAutosave();
		saveNote(editor.value);
	}

	function scheduleAutosave(): void {
		cancelAutosave();
		autosaveTimer = setTimeout(saveNow, AUTOSAVE_DELAY_MS);
	}

	function showEditor(): void {
		preview.hidden = true;
		editor.hidden = false;
		editButton.setAttribute("aria-pressed", "true");
		previewButton.setAttribute("aria-pressed", "false");
		editor.focus();
	}

	function showPreview(): void {
		saveNow();
		preview.innerHTML = renderMarkdown(editor.value);
		editor.hidden = true;
		preview.hidden = false;
		editButton.setAttribute("aria-pressed", "false");
		previewButton.setAttribute("aria-pressed", "true");
	}

	editor.value = loadNote();
	editor.addEventListener("input", scheduleAutosave);
	editButton.addEventListener("click", showEditor);
	previewButton.addEventListener("click", showPreview);
	clearButton.addEventListener("click", () => {
		cancelAutosave();
		editor.value = "";
		clearNote();
		showEditor();
	});
	txtButton.addEventListener("click", () => {
		download("note.txt", editor.value, "text/plain");
	});
	mdButton.addEventListener("click", () => {
		download("note.md", editor.value, "text/markdown");
	});
	window.addEventListener("beforeunload", saveNow);

	showEditor();
}
