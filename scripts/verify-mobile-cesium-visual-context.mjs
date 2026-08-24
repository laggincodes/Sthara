import { writeFile } from "node:fs/promises";

const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const target = targets.find(item => item.type === "page" && /^https:\/\/3000-[^.]+\.sg1\.manus\.computer\//.test(item.url));
if (!target?.webSocketDebuggerUrl) throw new Error("Active dashboard browser target was not found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 1;
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), 20_000);
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
const evaluate = expression => call("Runtime.evaluate", { expression, returnByValue: true }).then(result => result.result.value);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

async function readState(site) {
  await call("Page.navigate", { url: `https://3000-inzrqybnvbaou804fp9rz-c490c85f.sg1.manus.computer/workspace?site=${encodeURIComponent(site)}` });
  await wait(7_000);
  return JSON.parse(await evaluate("JSON.stringify({viewport:[innerWidth,innerHeight],status:document.querySelector('.cesium-status')?.textContent,attribution:document.querySelector('.cesium-osm-attribution')?.textContent,heading:document.querySelector('.spatial-stage-heading h1')?.textContent,empty:document.querySelector('.three-building-empty')?.textContent,sourceFacts:document.querySelector('.spatial-source-facts')?.textContent})"));
}

const matched = await readState("IIT Patna");
const unmatched = await readState("Unknown tower in Patna");
await writeFile("/tmp/ulpin-mobile-cesium-visual-context.json", JSON.stringify({ matched, unmatched }, null, 2));
socket.close();
console.log(JSON.stringify({ matched, unmatched, output: "/tmp/ulpin-mobile-cesium-visual-context.json" }, null, 2));
