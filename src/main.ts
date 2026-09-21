import { createApp } from "./app.ts";
import "./style.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) {
	throw new Error("Missing #app mount point");
}
createApp(root);
