import { initInterpreter } from "./interpreter";

(async () => {
  // Build main Interpreter
  const interpreter = await initInterpreter();
  
  // When code is received run it
  addEventListener("message", async (event) => {
    const code = event.data;
    const result = await interpreter.run(code);
    postMessage({ result });
  });
  
  // Send a message when finished loading
  postMessage({ loaded: true })
})()