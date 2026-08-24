import { writeFile } from "node:fs/promises";

const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const target =
  targets.find(
    item =>
      item.type === "page" &&
      /^https:\/\/3000-[^.]+\.sg1\.manus\.computer\//.test(item.url)
  ) ?? targets.find(item => item.type === "page");
if (!target?.webSocketDebuggerUrl) {
  throw new Error("Active dashboard browser target was not found");
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
  call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }).then(result => result.result.value);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
await call("Page.navigate", {
  url: "https://3000-inzrqybnvbaou804fp9rz-c490c85f.sg1.manus.computer/",
});
await wait(3_500);
const result = JSON.parse(
  await evaluate(`(async () => {
    const button = [...document.querySelectorAll('button')].find(candidate => candidate.textContent?.includes('Download SIH PDF'));
    if (!button) return JSON.stringify({ error: 'PDF export button not found' });
    let downloadedFilename = null;
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function patchedClick() {
      downloadedFilename = this.download || null;
      return originalClick.call(this);
    };
    button.click();
    await new Promise(resolve => setTimeout(resolve, 1_300));
    HTMLAnchorElement.prototype.click = originalClick;
    return JSON.stringify({
      buttonText: button.textContent?.trim(),
      downloadedFilename,
      exportReady: downloadedFilename === 'sih-academic-block-4-evidence.pdf',
      rawErrorVisible: document.body.innerText.includes('TRPCClientError'),
    });
  })()`)
);
await writeFile(
  "/tmp/ulpin-academic-block-4-pdf-export.json",
  JSON.stringify(result, null, 2)
);
socket.close();
console.log(
  JSON.stringify(
    { ...result, output: "/tmp/ulpin-academic-block-4-pdf-export.json" },
    null,
    2
  )
);
