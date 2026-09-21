import { beforeEach, describe, expect, it } from "vitest";
import { clearNote, loadNote, saveNote } from "./storage.ts";

describe("storage", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("returns an empty string when nothing has been saved", () => {
		expect(loadNote()).toBe("");
	});

	it("round-trips saved text", () => {
		saveNote("hello **world**");
		expect(loadNote()).toBe("hello **world**");
	});

	it("clears saved text", () => {
		saveNote("something");
		clearNote();
		expect(loadNote()).toBe("");
	});
});
