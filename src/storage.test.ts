import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearNote,
	loadNote,
	onNoteChange,
	STORAGE_KEY,
	saveNote,
} from "./storage.ts";

describe("storage", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns an empty string when nothing has been saved", () => {
		expect(loadNote()).toBe("");
	});

	it("round-trips saved text", () => {
		expect(saveNote("hello **world**")).toBe(true);
		expect(loadNote()).toBe("hello **world**");
	});

	it("clears saved text", () => {
		saveNote("something");
		clearNote();
		expect(loadNote()).toBe("");
	});

	it("returns an empty string when storage cannot be read", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("SecurityError");
		});
		expect(loadNote()).toBe("");
	});

	it("reports failure instead of throwing when storage cannot be written", () => {
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("QuotaExceededError");
		});
		expect(saveNote("too big")).toBe(false);
	});

	it("does not throw when storage cannot be cleared", () => {
		vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
			throw new Error("SecurityError");
		});
		expect(() => clearNote()).not.toThrow();
	});

	describe("onNoteChange", () => {
		function emit(key: string | null, newValue: string | null) {
			window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
		}

		it("notifies when another tab saves the note", () => {
			const listener = vi.fn();
			onNoteChange(listener);
			emit(STORAGE_KEY, "from another tab");
			expect(listener).toHaveBeenCalledWith("from another tab");
		});

		it("reports an empty note when another tab clears it", () => {
			const listener = vi.fn();
			onNoteChange(listener);
			emit(STORAGE_KEY, null);
			expect(listener).toHaveBeenCalledWith("");
		});

		it("ignores other keys", () => {
			const listener = vi.fn();
			onNoteChange(listener);
			emit("unrelated", "x");
			expect(listener).not.toHaveBeenCalled();
		});

		it("stops notifying after unsubscribe", () => {
			const listener = vi.fn();
			const unsubscribe = onNoteChange(listener);
			unsubscribe();
			emit(STORAGE_KEY, "late");
			expect(listener).not.toHaveBeenCalled();
		});
	});
});
