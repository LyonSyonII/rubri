import { Interpreter } from "./interpreter";
import { setupEditor } from "./editor";
import { AnsiUp } from "ansi_up";

const runButton = document.body.querySelector<HTMLButtonElement>("button")!;
const liveEdit = document.body.querySelector<HTMLInputElement>("#live-edit")!;
const printLast = document.body.querySelector<HTMLInputElement>("#print-last")!;
const simpleEditor = document.body.querySelector<HTMLInputElement>("#simple-editor")!;
// const termElement = document.getElementById("terminal")!;
const terminal = document.getElementById("terminal")!;
terminal.innerHTML = "Downloading (Can take a while):";

// Interpreter initialization
const interpreter = new Interpreter();
// Add libraries downloaded to list
interpreter.onAssetDownloaded(lib => terminal.innerHTML += `\n${lib}`);
// When Interpreter is running disable the "Run" button
interpreter.onRun(() => {
  runButton.disabled = true;
  terminal.innerHTML = "Running...";
});

// Setup editor
simpleEditor.checked = localStorage.getItem("prefers-simple-editor") !== null;
let lastInput = "";
const editor = await setupEditor(document.getElementById("editor") as HTMLTextAreaElement, {
  simple: simpleEditor.checked,
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
    terminal.innerHTML = "";
  } else {
    editor.setValue('println!("Hello from WASM!");');
    runButton.click();
  }
});

// When result is received from a running Interpreter write it to the terminal
const ansiUp = new AnsiUp();
interpreter.onResult(result => {
  terminal.innerHTML = ansiUp.ansi_to_html(result);
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

simpleEditor.addEventListener("click", function() {
  if (this.checked) {
    localStorage.setItem("prefers-simple-editor", "true");
  } else {
    localStorage.removeItem("prefers-simple-editor");
  }
  location.reload();
})