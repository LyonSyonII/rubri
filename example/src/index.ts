import { Interpreter } from "./interpreter";
import { setupEditor } from "./editor";
import { AnsiUp } from "ansi_up";

const runButton = document.body.querySelector<HTMLButtonElement>("button")!;
const liveEdit = document.body.querySelector<HTMLInputElement>("#live-edit")!;
const printLast = document.body.querySelector<HTMLInputElement>("#print-last")!;
const termElement = document.getElementById("terminal")!;
const termInnerElement = document.getElementById("terminal-inner")!;
termInnerElement.innerHTML = "Downloading (Can take a while):";

// Interpreter initialization
const interpreter = new Interpreter();
// Add libraries downloaded to list
interpreter.onAssetDownloaded(lib => termInnerElement.innerHTML += `\n${lib}`);
// When Interpreter is running disable the "Run" button
interpreter.onRun(() => {
  runButton.disabled = true;
  termInnerElement.innerHTML = "Running...";
});

// Setup editor
let lastInput = "";
const editor = await setupEditor(document.body.querySelector<HTMLTextAreaElement>("textarea#input")!, {
  // Run the Interpreter when on "Live Edit" or the "Run" button is clicked
  onInput(code: string) {
    if (!liveEdit.checked || runButton.disabled) {
      return;
    }
    lastInput = code;
    interpreter.run(lastInput || "", printLast.checked);
  },
  onRun() {
    runButton.click();
  },
});
editor.setReadonly(false);

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

// When result is received from a running Interpreter write it to the terminal
const ansiUp = new AnsiUp();
interpreter.onResult(result => {
  termInnerElement.innerHTML = ansiUp.ansi_to_html(result);
  runButton.disabled = false;
  const value = editor.getValue();
  if (lastInput && lastInput !== value) {
    lastInput = value;
    interpreter.run(editor.getValue() || "", printLast.checked)
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