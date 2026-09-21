const MARKDOWN_PATTERNS: readonly RegExp[] = [
	/^\s{0,3}#{1,6}\s\S/m, // heading
	/^\s*[-*+]\s\S/m, // bullet list
	/^\s*\d+\.\s\S/m, // numbered list
	/^\s{0,3}>\s?\S/m, // blockquote
	/^\s{0,3}(```|~~~)/m, // code fence
	/\[[^\]]+\]\([^)]+\)/, // link
	/`[^`\n]+`/, // inline code
	/(\*\*|__)\S[^*_\n]*\S?(\*\*|__)/, // bold
	/(^|\s)[*_]\S[^*_\n]*[*_](\s|$|[.,;:!?])/, // italic
];

export function looksLikeMarkdown(text: string): boolean {
	return MARKDOWN_PATTERNS.some((pattern) => pattern.test(text));
}
