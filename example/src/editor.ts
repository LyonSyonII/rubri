import { importTheme } from "./codemirror-themes";

export type LoadEditorArgs = {
	simple: boolean,
	onRun: () => void,
	onInput: (code: string) => void,
}


export type Editor = {
	setReadonly: (readonly: boolean) => void;
	setTheme: (theme: "light" | "dark") => void;
	setValue: (value: string) => void;
	getValue: () => string;
}

export async function setupEditor(element: HTMLTextAreaElement, args: LoadEditorArgs): Promise<Editor> {
	if (args.simple) {
		return loadSimpleEditor(element, args);
	} else {
		return await loadCodemirror(element, args);
	}
}

export function loadSimpleEditor(input: HTMLTextAreaElement, args: LoadEditorArgs): Editor {
	input.addEventListener("input", function() {
		args.onInput(this.value)
	});
	input.addEventListener("keydown", (e) => {
		switch (e.key) {
			case "Tab": {
				e.preventDefault();
				e.stopPropagation();
				const [start, end] = [input.selectionStart, input.selectionEnd];
				input.setRangeText("  ", start, end, "end");
				break;
			}

			case "Backspace": {
				let [start, end] = [input.selectionStart, input.selectionEnd];
				if (start !== end) {
					return;
				}
				if (input.value.substring(start-2, start) !== "  ") {
					return;
				}
				e.preventDefault();
				e.stopPropagation();
				start -= 2;
				start >= 0 && input.setRangeText("", start, end, "end");
        input.dispatchEvent(new Event("input"))
				break;
			}
		
			case "Enter": {
				e.preventDefault();
				e.stopPropagation();
				if (e.ctrlKey) {
					args.onRun();
				} else {
					let indent = 0;
					for (let i = input.selectionEnd-1; i > 0; i--) {
						if (input.value[i] === "\n") break;
						else if (input.value[i] === " ") indent += 1;
						else indent = 0;
					}
					input.setRangeText("\n" + " ".repeat(indent), input.selectionStart, input.selectionEnd, "end");
				}
				input.dispatchEvent(new Event("input"));
				break;
			}
		}
	})
	return {
		setReadonly(readonly) {
			input.readOnly = readonly;
		},
		setTheme() {},
		setValue(value) {
			input.value = value;
		},
		getValue() {
			return input.value;
		},
	};
}

async function loadCodemirror(element: HTMLElement, { onRun, onInput }: LoadEditorArgs): Promise<Editor> {	
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

	console.log("keymap built");

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
	console.log("editor built");
	// Can't disable outline in any other way
	editor.dom.style.outline = "none";
	element.replaceWith(editor.dom);

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
	};
}