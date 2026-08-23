import { writeFile } from "node:fs/promises";

const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const target = targets.find(item => item.type === "page" && /^https:\/\/3000-[^.]+\.sg1\.manus\.computer\//.test(item.url));
if (!target?.webSocketDebuggerUrl) throw new Error("Active dashboard browser target was not found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 1;
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), 15_000);
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

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await new Promise(resolve => setTimeout(resolve, 2_500));
const dimensions = await call("Runtime.evaluate", { expression: "JSON.stringify({innerWidth, innerHeight, preview:[document.querySelector('.three-building-preview')?.clientWidth, document.querySelector('.three-building-preview')?.clientHeight], result:document.querySelector('.spatial-stage-heading h1')?.textContent})", returnByValue: true });
const screenshot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
await writeFile("/tmp/ulpin-three-mobile.png", Buffer.from(screenshot.data, "base64"));
socket.close();
console.log(dimensions.result.value);
console.log("/tmp/ulpin-three-mobile.png");
