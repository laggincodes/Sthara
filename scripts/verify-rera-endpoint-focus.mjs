import { writeFile } from "node:fs/promises";

const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const target = targets.find(item => item.type === "page");
if (!target?.webSocketDebuggerUrl) {
  throw new Error("Active browser page target was not found");
}

const socket = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 1;
const call = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for ${method}`)),
      20_000
    );
    const listener = event => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      socket.removeEventListener("message", listener);
      clearTimeout(timer);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    };
    socket.addEventListener("message", listener);
    socket.send(JSON.stringify({ id, method, params }));
  });
const evaluate = expression =>
  call("Runtime.evaluate", { expression, returnByValue: true }).then(
    result => result.result.value
  );
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
await call("Page.navigate", {
  url: "https://3000-inzrqybnvbaou804fp9rz-c490c85f.sg1.manus.computer/",
});
await wait(3_200);
const result = JSON.parse(
  await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(candidate => candidate.textContent?.includes('Focus RERA endpoint reference'));
    if (!button) return JSON.stringify({ error: 'RERA endpoint focus button not found' });
    button.click();
    return JSON.stringify({
      buttonText: button.textContent?.trim(),
      rawErrorVisible: document.body.innerText.includes('TRPCClientError'),
    });
  })()`)
);
await wait(1_200);
const screenshot = await call("Page.captureScreenshot", { format: "png" });
await writeFile(
  "/tmp/ulpin-rera-endpoint-focus.png",
  Buffer.from(screenshot.data, "base64")
);
socket.close();
console.log(
  JSON.stringify(
    { ...result, screenshot: "/tmp/ulpin-rera-endpoint-focus.png" },
    null,
    2
  )
);
