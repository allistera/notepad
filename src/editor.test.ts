import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEditor } from "./editor.ts";

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
	});

	it("starts with the given document", () => {
		const { editor } = mount("hello");
		expect(editor.getValue()).toBe("hello");
	});

	it("reports changes through onChange", () => {
		const { editor, onChange } = mount();
		editor.setValue("changed");
		expect(editor.getValue()).toBe("changed");
		expect(onChange).toHaveBeenCalledWith("changed");
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

	it("highlights Markdown once the text looks like Markdown", () => {
		const { parent, editor } = mount("Just a plain sentence.");
		editor.setValue("# Heading\n\nsome **bold** text");
		expect(parent.querySelector(".md-heading")).not.toBeNull();
		expect(parent.querySelector(".md-strong")).not.toBeNull();
	});

	it("stops highlighting when the text no longer looks like Markdown", () => {
		const { parent, editor } = mount("# Heading");
		expect(parent.querySelector(".md-heading")).not.toBeNull();
		editor.setValue("plain again");
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
});
