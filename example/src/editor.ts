import type { Compartment, Text } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

export async function setupEditor(element: HTMLElement, args: LoadCodemirrorArgs): Promise<CodeMirror> {
	const codemirror = await loadCodemirror(args);
	element.replaceWith(codemirror.editor.dom);
	return codemirror;
}

export type CodeMirror = {
	setReadonly: (readonly: boolean) => void;
	setTheme: (theme: "light" | "dark") => void;
	setValue: (value: string) => void;
	getValue: () => string;
	editor: EditorView
}

export type LoadCodemirrorArgs = {
	onRun: () => void,
	onInput: (code: string) => void,
}

async function loadCodemirror({onRun, onInput}: LoadCodemirrorArgs): Promise<CodeMirror> {
	const { closeBrackets, closeBracketsKeymap } = await import("@codemirror/autocomplete");
	const { defaultKeymap, history, historyKeymap, insertTab } = await import(
		"@codemirror/commands"
	);
	const { rust } = await import("@codemirror/lang-rust");
	const { bracketMatching, foldKeymap, indentOnInput } = await import("@codemirror/language");
	const { Compartment, EditorState, Prec } = await import("@codemirror/state");
	const {
		EditorView,
		highlightActiveLine,
		highlightActiveLineGutter,
		keymap,
		lineNumbers,
		placeholder,
	} = await import("@codemirror/view");

	const basicSetup = [
		lineNumbers(),
		highlightActiveLineGutter(),
		history(),
		EditorState.allowMultipleSelections.of(true),
		indentOnInput(),
		bracketMatching(),
		closeBrackets(),
		highlightActiveLine(),
		keymap.of([
			...closeBracketsKeymap,
			...defaultKeymap.filter((k) => k.key !== "Mod-Enter" && k.key !== "Shift-Enter"),
			...historyKeymap,
			...foldKeymap,
		]),
	];

	const readonlyCompartment = new Compartment();
	const themeCompartment = new Compartment();

	const runKeymap = Prec.highest(
		keymap.of([
			{
				key: "Shift-Enter",
				run: (e) => {
					onRun();
					return true;
				},
				stopPropagation: true,
				preventDefault: true
			},
			{
				key: "Mod-Enter",
				run: (e) => {
					onRun();
					return true;
				},
				stopPropagation: true,
				preventDefault: true,
			},
			{
				key: "Tab",
				run: insertTab,
				stopPropagation: true,
				preventDefault: true,
			},
		]),
	);

	const { importTheme } = await import("./codemirror-themes");

	const editor = new EditorView({
		state: EditorState.create({
			doc: 'println!("Hello WASM!")',
			extensions: [
				rust(),
				basicSetup,
				runKeymap,
				placeholder("Write your code..."),
				themeCompartment.of(await importTheme(document.documentElement.dataset.theme || "light")),
				readonlyCompartment.of(EditorState.readOnly.of(true)),
				EditorView.contentAttributes.of({ "aria-label": "Code Editor" }),
				EditorView.updateListener.of((e) => {
					if (e.docChanged) {
						onInput(e.state.doc.toString())
					}
				})
			],
		}),
	});
	// Can't disable outline in any other way
	editor.dom.style.outline = "none";

	return {
		setReadonly: (v) => {
			editor.dispatch({
				effects: readonlyCompartment.reconfigure(EditorState.readOnly.of(v)),
			});
		},
		setTheme: async (theme) => {
			editor.dispatch({
				effects: themeCompartment.reconfigure(await importTheme(theme)),
			});
		},
		setValue(value) {
			editor.dispatch({
				changes: { from: 0, to: editor.state.doc.length, insert: value },
			});
		},
		getValue() {
			return editor.state.doc.toString();
		},
		editor
	};
}