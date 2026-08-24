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

async function navigate(url) {
  await call("Page.navigate", { url });
  await wait(4_500);
}

async function tapAction(label) {
  const point = JSON.parse(await evaluate(`JSON.stringify((() => { const button = [...document.querySelectorAll('.spatial-action-dock button')].find(item => item.textContent.includes(${JSON.stringify(label)})); if (!button) return null; const r = button.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })())`));
  if (!point) throw new Error(`Action dock button not found: ${label}`);
  await call("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: point.x, y: point.y, id: 1 }] });
  await call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await wait(1_200);
}

const base = "https://3000-inzrqybnvbaou804fp9rz-c490c85f.sg1.manus.computer";
await navigate(`${base}/workspace?site=IIT%20Patna`);
await tapAction("Focus source");
const focusState = JSON.parse(await evaluate("JSON.stringify({heading:document.querySelector('.spatial-stage-heading h1')?.textContent, chip:document.querySelector('.spatial-selection-chip')?.textContent})"));

await tapAction("Attach height evidence");
const evidenceIntakeState = JSON.parse(await evaluate("JSON.stringify({url:location.pathname + location.search, title:[...document.querySelectorAll('h1,h2')].map(node => node.textContent).find(text => text?.includes('Add spatial evidence'))})"));

await navigate(`${base}/workspace?site=IIT%20Patna`);
await tapAction("Operator access");
const operatorState = JSON.parse(await evaluate("JSON.stringify({url:location.pathname + location.search, title:[...document.querySelectorAll('h1,h2')].map(node => node.textContent).find(text => text?.includes('Operator access'))})"));

const viewport = JSON.parse(await evaluate("JSON.stringify([innerWidth, innerHeight])"));
await writeFile("/tmp/ulpin-mobile-action-dock.json", JSON.stringify({ viewport, focusState, evidenceIntakeState, operatorState }, null, 2));
socket.close();
console.log(JSON.stringify({ focusState, evidenceIntakeState, operatorState, output: "/tmp/ulpin-mobile-action-dock.json" }, null, 2));
