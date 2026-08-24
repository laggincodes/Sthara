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
await call("Emulation.setDeviceMetricsOverride", { width: 396, height: 857, deviceScaleFactor: 1, mobile: true });
await wait(1_000);

async function touchSearch(query) {
  const input = JSON.parse(await evaluate("JSON.stringify((() => { const r = document.querySelector('.spatial-workspace-topbar input').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })())"));
  await call("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: input.x, y: input.y, id: 1 }] });
  await call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await call("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2 });
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 });
  await call("Input.insertText", { text: query });
  const locate = JSON.parse(await evaluate("JSON.stringify((() => { const r = document.querySelector('.spatial-workspace-topbar form button').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })())"));
  await call("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: locate.x, y: locate.y, id: 2 }] });
  await call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await wait(8_000);
}

async function snapshot(name) {
  const state = JSON.parse(await evaluate("JSON.stringify({viewport:[innerWidth,innerHeight],heading:document.querySelector('.spatial-stage-heading h1')?.textContent,focus:document.querySelector('.spatial-stage-heading span')?.textContent,note:document.querySelector('.spatial-resolution-note')?.textContent,preview:document.querySelector('.three-building-preview')?.getBoundingClientRect().toJSON(),empty:document.querySelector('.three-building-empty')?.textContent})"));
  const screenshot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  const image = `/tmp/ulpin-${name}-mobile.png`;
  await writeFile(image, Buffer.from(screenshot.data, "base64"));
  return { state, image };
}

await touchSearch("All India Institute of Medical Sciences Patna");
const aiims = await snapshot("aiims-patna");
if (!aiims.state.heading?.includes("AIIMS Patna reference area")) throw new Error(`AIIMS mobile search did not resolve to the verified source area: ${aiims.state.heading}`);
if (!aiims.state.focus?.includes("18 matched PostGIS footprints")) throw new Error(`AIIMS mobile search did not report the expected live geometry count: ${aiims.state.focus}`);
if (!aiims.state.preview) throw new Error("AIIMS mobile search did not render a Three.js source-footprint preview");

await touchSearch("Unknown tower in Patna");
const unknown = await snapshot("unknown-patna");
if (!unknown.state.empty?.includes("No verified 3D building model")) throw new Error(`Unknown mobile search did not retain the no-model guard: ${unknown.state.empty}`);

socket.close();
console.log(JSON.stringify({ aiims, unknown }, null, 2));
