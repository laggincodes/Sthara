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
await wait(2_000);

async function searchFromMobile(query) {
  const geometry = JSON.parse(await evaluate("JSON.stringify((() => { const input = document.querySelector('.spatial-workspace-topbar input'); const r = input.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })())"));
  await call("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: geometry.x, y: geometry.y, id: 1 }] });
  await call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await call("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2 });
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 });
  await call("Input.insertText", { text: query });
  await wait(120);
  const visibleValue = await evaluate("document.querySelector('.spatial-workspace-topbar input')?.value");
  if (visibleValue !== query) throw new Error(`Mobile search input did not accept the requested query: ${visibleValue}`);
  const button = JSON.parse(await evaluate("JSON.stringify((() => { const r = document.querySelector('.spatial-workspace-topbar form button').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })())"));
  await call("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: button.x, y: button.y, id: 2 }] });
  await call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await wait(8_000);
}

async function snapshot(name) {
  const state = await evaluate("JSON.stringify({viewport:[innerWidth,innerHeight], heading:document.querySelector('.spatial-stage-heading h1')?.textContent, sourceFocus:document.querySelector('.spatial-stage-heading span')?.textContent, chip:document.querySelector('.spatial-selection-chip')?.textContent, preview:document.querySelector('.three-building-preview')?.getBoundingClientRect().toJSON(), empty:document.querySelector('.three-building-empty')?.textContent, note:document.querySelector('.spatial-resolution-note')?.textContent})");
  const screenshot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(`/tmp/ulpin-${name}-mobile.png`, Buffer.from(screenshot.data, "base64"));
  return JSON.parse(state);
}

await searchFromMobile("Amity building near Rupaspur");
const matchedBefore = await snapshot("matched-before-rotate");
const canvas = JSON.parse(await evaluate("JSON.stringify((() => { const r = document.querySelector('.three-building-preview canvas').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })())"));
await call("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: canvas.x, y: canvas.y, id: 7 }] });
await call("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: canvas.x + 80, y: canvas.y + 5, id: 7 }] });
await call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await wait(300);
const matchedAfter = await snapshot("matched-after-rotate");
await searchFromMobile("Unknown tower in Patna");
const unmatched = await snapshot("unmatched");
socket.close();
console.log(JSON.stringify({ matchedBefore, matchedAfter, unmatched, images: ["/tmp/ulpin-matched-before-rotate-mobile.png", "/tmp/ulpin-matched-after-rotate-mobile.png", "/tmp/ulpin-unmatched-mobile.png"] }, null, 2));
