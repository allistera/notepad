import { describe, expect, it } from "vitest";
import { looksLikeMarkdown } from "./detect.ts";

describe("looksLikeMarkdown", () => {
	it.each([
		["heading", "# Title"],
		["bullet list", "- one\n- two"],
		["numbered list", "1. first\n2. second"],
		["blockquote", "> quoted"],
		["code fence", "```js\nconsole.log(1)\n```"],
		["link", "see [docs](https://example.com)"],
		["inline code", "run `npm test` now"],
		["bold", "this is **important**"],
		["italic", "this is _subtle_"],
	])("detects %s", (_name, text) => {
		expect(looksLikeMarkdown(text)).toBe(true);
	});

	it.each([
		["empty", ""],
		["plain prose", "Just a normal sentence about groceries."],
		["a hash inside a word", "issue#42 needs fixing"],
		["hyphenated words", "well-known and up-to-date"],
		["a bare number", "2024 was a good year."],
		["snake case", "snake_case_name here"],
	])("does not flag %s", (_name, text) => {
		expect(looksLikeMarkdown(text)).toBe(false);
	});
});
