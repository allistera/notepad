import DOMPurify from "dompurify";
import { marked } from "marked";

export function renderMarkdown(source: string): string {
	if (source.trim() === "") {
		return "";
	}
	const html = marked.parse(source, { async: false, gfm: true });
	return DOMPurify.sanitize(html);
}
