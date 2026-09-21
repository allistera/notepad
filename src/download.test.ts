import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadFile } from "./download.ts";

describe("downloadFile", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("triggers a download with the given filename and content", async () => {
		const createObjectURL = vi.fn((_blob: Blob) => "blob:mock");
		const revokeObjectURL = vi.fn();
		vi.stubGlobal("URL", {
			...URL,
			createObjectURL,
			revokeObjectURL,
		});
		const clicked: HTMLAnchorElement[] = [];
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
			this: HTMLAnchorElement,
		) {
			clicked.push(this);
		});

		downloadFile("note.txt", "hello", "text/plain");

		expect(clicked).toHaveLength(1);
		expect(clicked[0]?.download).toBe("note.txt");
		expect(clicked[0]?.href).toBe("blob:mock");
		expect(createObjectURL).toHaveBeenCalledTimes(1);
		const blob = createObjectURL.mock.calls[0]?.[0];
		if (!blob) {
			throw new Error("createObjectURL was not called with a blob");
		}
		expect(blob.type).toBe("text/plain");
		expect(await blob.text()).toBe("hello");
		expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
	});
});
