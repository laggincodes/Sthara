import { createServer } from "http";
import net from "net";
import { createApp } from "./index";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  process.env.NODE_ENV = process.env.NODE_ENV || "development";
  console.log("Initializing Express app...");
  const app = createApp();
  const server = createServer(app);

  if (process.env.NODE_ENV === "development") {
    console.log("Setting up Vite middleware...");
    await setupVite(app, server);
    console.log("Vite middleware initialized.");
  } else {
    serveStatic(app);
  }

  const basePort = parseInt(process.env.PORT || "5173", 10);

  const listenOnPort = (port: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      const errorHandler = (err: any) => {
        if (err.code === "EADDRINUSE") {
          console.log(`Port ${port} is in use, trying port ${port + 1}...`);
          server.removeListener("error", errorHandler);
          resolve(listenOnPort(port + 1));
        } else {
          server.removeListener("error", errorHandler);
          reject(err);
        }
      };

      server.once("error", errorHandler);
      server.listen(port, "0.0.0.0", () => {
        server.removeListener("error", errorHandler);
        resolve(port);
      });
    });
  };

  const activePort = await listenOnPort(basePort);

  console.log(`\n========================================`);
  console.log(`🚀 SIH-2026 ULPIN-VPM Cadastre Platform`);
  console.log(`📡 Local:   http://localhost:${activePort}`);
  console.log(`🌐 Network: http://127.0.0.1:${activePort}`);
  console.log(`========================================\n`);
}

startServer().catch(console.error);
