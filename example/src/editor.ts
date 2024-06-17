export function setupEditor(input: HTMLTextAreaElement, runButton: HTMLButtonElement) {
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
				e.preventDefault();
				e.stopPropagation();
				if (input.value.substring(start-2, start+1) === "  ") {
					start -= 2;
				} else {
					start -= 1;
				}
				start >= 0 && input.setRangeText("", start, end, "end");
        input.dispatchEvent(new Event("input"))
				break;
			}
		
			case "Enter": {
				e.preventDefault();
				e.stopPropagation();
				if (e.ctrlKey) {
					runButton.click();
				} else {
					// TODO: Add indentation based on previous line
					input.setRangeText("\n" + " ".repeat(0), input.selectionStart, input.selectionEnd, "end");
				}
				input.dispatchEvent(new Event("input"));
				break;
			}
		}
	})
}