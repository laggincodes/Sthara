const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const target = targets.find(item => item.type === "page" && item.url.includes("3000-i03ctryp13lth9gsnihfq-96d9fe91.sg1.manus.computer"));

if (!target?.webSocketDebuggerUrl) throw new Error("Active dashboard browser target was not found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
const response = await new Promise((resolve, reject) => {
  socket.addEventListener("open", () => socket.send(JSON.stringify({
    id: 1,
    method: "Emulation.setDeviceMetricsOverride",
    params: { width: 390, height: 844, deviceScaleFactor: 3, mobile: true },
  })));
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.id === 1) resolve(message);
  });
  socket.addEventListener("error", reject);
});

socket.close();
console.log(JSON.stringify({ viewport: "390x844 mobile", response }));
