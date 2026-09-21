import {
	defineLanguageFacet,
	HighlightStyle,
	Language,
	LanguageSupport,
	syntaxHighlighting,
} from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, placeholder } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { GFM, parser as markdownParser } from "@lezer/markdown";
import { minimalSetup } from "codemirror";
import { looksLikeMarkdown } from "./markdown-detect.ts";

export interface EditorOptions {
	doc: string;
	placeholder: string;
	onChange: (value: string) => void;
}

export interface EditorHandle {
	getValue(): string;
	setValue(value: string): void;
	focus(): void;
	setHidden(hidden: boolean): void;
}

const markdownHighlight = HighlightStyle.define([
	{ tag: tags.heading, class: "md-heading" },
	{ tag: tags.strong, class: "md-strong" },
	{ tag: tags.emphasis, class: "md-emphasis" },
	{ tag: tags.link, class: "md-link" },
	{ tag: tags.url, class: "md-url" },
	{ tag: tags.monospace, class: "md-code" },
	{ tag: tags.processingInstruction, class: "md-mark" },
	{ tag: tags.contentSeparator, class: "md-mark" },
]);

// Built directly on the Lezer parser rather than @codemirror/lang-markdown,
// which would also bundle the HTML, JavaScript and CSS parsers.
const markdownLanguage = new Language(
	defineLanguageFacet(),
	markdownParser.configure(GFM),
	[],
	"markdown",
);

const markdownExtensions = [
	new LanguageSupport(markdownLanguage),
	syntaxHighlighting(markdownHighlight),
];

export function createEditor(
	parent: HTMLElement,
	options: EditorOptions,
): EditorHandle {
	const language = new Compartment();
	let markdownMode = looksLikeMarkdown(options.doc);

	const view = new EditorView({
		parent,
		state: EditorState.create({
			doc: options.doc,
			extensions: [
				minimalSetup,
				EditorView.lineWrapping,
				placeholder(options.placeholder),
				EditorView.contentAttributes.of({
					"aria-label": "Note",
					spellcheck: "true",
				}),
				language.of(markdownMode ? markdownExtensions : []),
				EditorView.updateListener.of((update) => {
					if (!update.docChanged) {
						return;
					}
					const value = update.state.doc.toString();
					const shouldHighlight = looksLikeMarkdown(value);
					if (shouldHighlight !== markdownMode) {
						markdownMode = shouldHighlight;
						view.dispatch({
							effects: language.reconfigure(
								shouldHighlight ? markdownExtensions : [],
							),
						});
					}
					options.onChange(value);
				}),
			],
		}),
	});

	return {
		getValue: () => view.state.doc.toString(),
		setValue: (value) => {
			view.dispatch({
				changes: { from: 0, to: view.state.doc.length, insert: value },
			});
		},
		focus: () => view.focus(),
		setHidden: (hidden) => {
			view.dom.hidden = hidden;
		},
	};
}
