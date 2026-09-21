const STORAGE_KEY = "notepad:content";

export function loadNote(): string {
	return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function saveNote(text: string): void {
	localStorage.setItem(STORAGE_KEY, text);
}

export function clearNote(): void {
	localStorage.removeItem(STORAGE_KEY);
}
