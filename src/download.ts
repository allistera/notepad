// Firefox can abort a download if the object URL is revoked before it has
// been fetched, so the revoke is deferred rather than run synchronously.
const REVOKE_DELAY_MS = 60_000;

export function downloadFile(
	filename: string,
	content: string,
	mimeType: string,
): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
