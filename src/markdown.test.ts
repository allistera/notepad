import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown.ts";

describe("renderMarkdown", () => {
	it("renders headings and emphasis as HTML", () => {
		const html = renderMarkdown("# Title\n\nSome **bold** text");
		expect(html).toContain("<h1>Title</h1>");
		expect(html).toContain("<strong>bold</strong>");
	});

	it("strips script tags and inline event handlers", () => {
		const html = renderMarkdown(
			'<script>alert(1)</script><img src="x" onerror="alert(1)">',
		);
		expect(html).not.toContain("<script");
		expect(html).not.toContain("onerror");
	});

	it("returns an empty string for empty input", () => {
		expect(renderMarkdown("")).toBe("");
	});
});
