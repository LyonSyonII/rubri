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
	const { closeBrackets, autocompletion, completionKeymap, closeBracketsKeymap } = await import("@codemirror/autocomplete");
	const { history, insertTab, defaultKeymap, historyKeymap, standardKeymap } = await import(
		"@codemirror/commands"
	);
	const { search, searchKeymap } = await import("@codemirror/search");
	const { rust } = await import("@codemirror/lang-rust");
	const { bracketMatching, indentOnInput, foldKeymap } = await import("@codemirror/language");
	const { Compartment, EditorState, Prec } = await import("@codemirror/state");
	const {
		EditorView,
		highlightActiveLine,
		highlightActiveLineGutter,
		keymap,
		lineNumbers,
		placeholder,
		drawSelection,
		scrollPastEnd,
	} = await import("@codemirror/view");

	const basicSetup = [
		autocompletion(),
		bracketMatching(),
		closeBrackets(),
		scrollPastEnd(),
		drawSelection(),
		search(),
		highlightActiveLine(),
		highlightActiveLineGutter(),
		history(),
		indentOnInput(),
		lineNumbers(),
		EditorState.allowMultipleSelections.of(true),
		keymap.of([
			...standardKeymap,
			...defaultKeymap.filter((k) => k.key !== "Mod-Enter" && k.key !== "Shift-Enter"),
			...foldKeymap,
			...historyKeymap,
			...searchKeymap,
			...completionKeymap,
			...closeBracketsKeymap,
			// ...lintKeymap,
		]),
	];

	const readonlyCompartment = new Compartment();
	const themeCompartment = new Compartment();

	const runKeymap = Prec.highest(
		keymap.of([
			{
				key: "Shift-Enter",
				run: () => {
					onRun();
					return true;
				},
				stopPropagation: true,
				preventDefault: true
			},
			{
				key: "Mod-Enter",
				run: () => {
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
			}
		]),
	);

	const { importTheme } = await import("./codemirror-themes");

	const editor = new EditorView({
		state: EditorState.create({
			doc: 'println!("Hello WASM!")',
			extensions: [
				basicSetup,
				runKeymap,
				rust(),
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