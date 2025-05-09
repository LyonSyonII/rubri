import { Interpreter } from "./interpreter";
import { setupEditor } from "./editor";
import { AnsiUp } from "ansi_up";
import type { Text } from "@codemirror/state";

const runButton = document.body.querySelector<HTMLButtonElement>("button")!;
const liveEdit = document.body.querySelector<HTMLInputElement>("#live-edit")!;
const printLast = document.body.querySelector<HTMLInputElement>("#print-last")!;
const termElement = document.getElementById("terminal")!;
const termInnerElement = document.getElementById("terminal-inner")!;

// Interpreter initialization
let lastInput = "";
const interpreter = new Interpreter();

// Setup editor
termInnerElement.innerHTML = "Downloading (Can take a while):";
const onInput = (code: string) => {
  if (!liveEdit.checked || runButton.disabled) {
    return;
  }
  lastInput = code;
  interpreter.run(lastInput || "", printLast.checked);
}
const editor = await setupEditor(document.body.querySelector<HTMLTextAreaElement>("textarea#input")!, {
  // Run the Interpreter when on "Live Edit" or the "Run" button is clicked
  onInput,
  onRun() {
    runButton.click();
  },
});

editor.setReadonly(false);

// Add libraries downloaded to list
interpreter.onAssetDownloaded(lib => termInnerElement.innerHTML += `\n${lib}`);

// When Interpreter has finished loading, add default code
interpreter.onLoaded(() => {
  const v = localStorage.getItem("code-input");
  if (v) {
    editor.setValue(v);
    termInnerElement.innerHTML = "";
  } else {
    editor.setValue('println!("Hello from WASM!");');
    runButton.click();
  }
});

// When Interpreter is running disable the "Run" button
interpreter.onRun(() => {
  runButton.disabled = true;
  termInnerElement.innerHTML = "Running...";
});

// When result is received from a running Interpreter write it to the terminal
const ansiUp = new AnsiUp();
interpreter.onResult(result => {
  termInnerElement.innerHTML = ansiUp.ansi_to_html(result.replaceAll("\n", "\r"));
  runButton.disabled = false;
  const value = editor.getValue();
  if (lastInput && lastInput !== value) {
    onInput(value);
  } else {
    localStorage.setItem("code-input", value);
  }
});

runButton.addEventListener("click", async () => {
  if (runButton.disabled) {
    return;
  }
  interpreter.run(editor.getValue() || "", printLast.checked)
});