import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEditor, DETECT_DELAY_MS } from "./editor.ts";

function mount(doc = "") {
	const parent = document.createElement("div");
	document.body.append(parent);
	const onChange = vi.fn();
	const editor = createEditor(parent, {
		doc,
		placeholder: "Start writing…",
		onChange,
	});
	return { parent, editor, onChange };
}

describe("createEditor", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("starts with the given document", () => {
		const { editor } = mount("hello");
		expect(editor.getValue()).toBe("hello");
	});

	it("reports changes through onChange", () => {
		const { editor, onChange } = mount();
		editor.setValue("changed");
		expect(editor.getValue()).toBe("changed");
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("focuses the editable content", () => {
		const { parent, editor } = mount();
		editor.focus();
		expect(document.activeElement).toBe(parent.querySelector(".cm-content"));
	});

	it("shows the placeholder when empty", () => {
		const { parent } = mount();
		expect(parent.querySelector(".cm-placeholder")?.textContent).toBe(
			"Start writing…",
		);
	});

	it("does not highlight plain text", () => {
		const { parent } = mount("Just a plain sentence.");
		expect(parent.querySelector(".md-heading")).toBeNull();
		expect(parent.querySelector(".md-mark")).toBeNull();
	});

	it("highlights a Markdown document from the start", () => {
		const { parent } = mount("# Heading");
		expect(parent.querySelector(".md-heading")).not.toBeNull();
	});

	it("defers Markdown detection until typing pauses", () => {
		const { parent, editor } = mount("Just a plain sentence.");
		editor.setValue("# Heading\n\nsome **bold** text");
		expect(parent.querySelector(".md-heading")).toBeNull();
		vi.advanceTimersByTime(DETECT_DELAY_MS);
		expect(parent.querySelector(".md-heading")).not.toBeNull();
		expect(parent.querySelector(".md-strong")).not.toBeNull();
	});

	it("stops highlighting when the text no longer looks like Markdown", () => {
		const { parent, editor } = mount("# Heading");
		editor.setValue("plain again");
		vi.advanceTimersByTime(DETECT_DELAY_MS);
		expect(parent.querySelector(".md-heading")).toBeNull();
	});

	it("hides and shows its DOM", () => {
		const { parent, editor } = mount();
		const dom = parent.querySelector<HTMLElement>(".cm-editor");
		editor.setHidden(true);
		expect(dom?.hidden).toBe(true);
		editor.setHidden(false);
		expect(dom?.hidden).toBe(false);
	});

	it("removes itself from the DOM and drops pending detection on destroy", () => {
		const { parent, editor } = mount();
		editor.setValue("# Heading");
		editor.destroy();
		expect(parent.querySelector(".cm-editor")).toBeNull();
		expect(() => vi.runAllTimers()).not.toThrow();
	});
});
