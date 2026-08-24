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
await wait(2_800);
const result = JSON.parse(
  await evaluate(`(() => {
    const input = document.querySelector('input[placeholder*="AI lookup"]');
    if (!input) return JSON.stringify({ error: 'AI lookup input not found' });
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, 'block-4');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('focus', { bubbles: true }));
    const options = [...document.querySelectorAll('.area-autocomplete-menu button')].map(option => option.textContent?.trim());
    return JSON.stringify({
      suggestions: options,
      onlySourceAwareBlock4: options.length === 1 && options[0]?.includes('source-cited'),
      rawErrorVisible: document.body.innerText.includes('TRPCClientError'),
    });
  })()`)
);
socket.close();
console.log(JSON.stringify(result, null, 2));
