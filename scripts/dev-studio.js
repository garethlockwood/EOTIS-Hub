#!/usr/bin/env node
const { spawn } = require("child_process");
const net = require("net");

function findAvailablePort(start = 6010, end = 6099) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      if (port > end) return reject("No available port found");
      const server = net.createServer();
      server.once("error", () => tryPort(port + 1));
      server.once("listening", () => {
        server.close(() => resolve(port));
      });
      server.listen(port);
    };
    tryPort(start);
  });
}

(async () => {
  const port = await findAvailablePort();
  console.log(`🚀 Starting dev server on port ${port}...`);

  const dev = spawn("npm", ["run", "next-dev", "--", "-p", port], {
    stdio: "inherit",
    env: { ...process.env, PORT: port },
  });

  console.log(`\n🧭 Visit Firebase Studio and point preview to http://localhost:${port}\n`);
})();
