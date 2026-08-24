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
await call("Page.navigate", { url: "https://3000-inzrqybnvbaou804fp9rz-c490c85f.sg1.manus.computer/?editor=MS-BUILDING-123133020-0a9141a8cdb7dc5c" });
await wait(5_000);
const result = JSON.parse(await evaluate(`(() => {
  const input = document.querySelector('input[placeholder="Why this correction is approved"]');
  if (!input) return JSON.stringify({ error: "Revision note input not found" });
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, "short");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("blur", { bubbles: true }));
  return JSON.stringify({ viewport: [innerWidth, innerHeight], help: document.querySelector('#revision-note-help')?.textContent, rawMutationError: document.body.innerText.includes("TRPCClientError"), url: location.href });
})()`));
await writeFile("/tmp/ulpin-mobile-edit-note-guard.json", JSON.stringify(result, null, 2));
socket.close();
console.log(JSON.stringify({ ...result, output: "/tmp/ulpin-mobile-edit-note-guard.json" }, null, 2));
