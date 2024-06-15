import { initInterpreter } from "./interpreter";

(async () => {
  const interpreter = await initInterpreter();

  addEventListener("message", async (event) => {
    const code = event.data;
    const result = await interpreter.run(code);
    postMessage({ result });
  });

  postMessage({ loaded: true })
})()