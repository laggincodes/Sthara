import { writeFile } from "node:fs/promises";

const previewUrl = "https://3000-i03ctryp13lth9gsnihfq-96d9fe91.sg1.manus.computer/?editor=MS-BUILDING-123133020-4ccb72e4db684f81";
const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const target = targets.find(item => item.type === "page" && item.url.includes("3000-i03ctryp13lth9gsnihfq-96d9fe91.sg1.manus.computer"));

if (!target?.webSocketDebuggerUrl) throw new Error("Active dashboard browser target was not found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map();

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  }
});

try {
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await send("Page.enable");
  await send("Page.navigate", { url: previewUrl });
  await new Promise(resolve => setTimeout(resolve, 4500));
  const evaluation = await send("Runtime.evaluate", {
    expression: `JSON.stringify({
      width: window.innerWidth,
      height: window.innerHeight,
      editorOpen: Boolean(document.querySelector('.editor-shell')),
      ulpin: document.querySelector('.editor-actions code')?.textContent?.trim() || null,
      formWidth: Math.round(document.querySelector('.editor-dialog')?.getBoundingClientRect().width || 0),
      formLeft: Math.round(document.querySelector('.editor-dialog')?.getBoundingClientRect().left || 0)
    })`,
    returnByValue: true,
  });
  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile("/home/ubuntu/ulpin-vpm-dashboard/research/mobile-authority-editor-390x844.png", Buffer.from(screenshot.data, "base64"));
  console.log(evaluation.result.value);
} finally {
  await send("Emulation.clearDeviceMetricsOverride").catch(() => undefined);
  socket.close();
}
