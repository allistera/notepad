export const STORAGE_KEY = "notepad:content";

export function loadNote(): string {
	try {
		return localStorage.getItem(STORAGE_KEY) ?? "";
	} catch {
		return "";
	}
}

/** Returns false when the browser refuses the write (quota, private mode, disabled storage). */
export function saveNote(text: string): boolean {
	try {
		localStorage.setItem(STORAGE_KEY, text);
		return true;
	} catch {
		return false;
	}
}

export function clearNote(): void {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Nothing to clear if storage is unavailable.
	}
}

/** Calls listener when another tab saves or clears the note. Returns an unsubscribe function. */
export function onNoteChange(listener: (text: string) => void): () => void {
	const handler = (event: StorageEvent) => {
		if (event.key === STORAGE_KEY) {
			listener(event.newValue ?? "");
		}
	};
	window.addEventListener("storage", handler);
	return () => window.removeEventListener("storage", handler);
}
