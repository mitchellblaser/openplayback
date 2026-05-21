const { app, BrowserWindow } = require('electron');
const path = require('path');
const WebSocket = require("ws");
const { Client } = require("ssh2");
const fs = require("fs");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // win.webContents.openDevTools();

  win.loadFile(path.join(__dirname, '../dist/index.html'));
}


function startSSHServer() {

  const wss = new WebSocket.Server({
    port: 3001,
  });

  console.log("Embedded SSH server running on port 3001");

  wss.on("connection", (ws, req) => {
    const params = new URLSearchParams(
      req.url.replace("/ssh?", "")
    );
    const rawHost = params.get("host");
    const host = rawHost.split(":")[0];
    console.log("SSH connect:", host);
    const conn = new Client();
    conn.on("ready", () => {
      ws.send("SSH connected\r\n");
      conn.shell((err, stream) => {
        if (err) {
          ws.send(`Shell error: ${err.message}\r\n`);
          return;
        }

        stream.on("data", (data) => {
          ws.send(data.toString());
        });

        stream.stderr.on("data", (data) => {
          ws.send(data.toString());
        });

        ws.on("message", (msg) => {
          stream.write(msg);
        });

        ws.on("close", () => {
          stream.close();
          conn.end();
        });
      });
    });

    conn.on("error", (err) => {
      console.error("SSH error:", err.message);
      ws.send(`SSH Error: ${err.message}\r\n`);
      ws.close();
    });

    conn.connect({
      host,
      port: 22,
      username: params.get("username"),
      password: params.get("password"),
    });
  });
}

app.whenReady().then(() => {
  startSSHServer();
  createWindow();
});

// app.whenReady().then(createWindow);
// app.whenReady().then(() => {
//   startSSHServer();
//   createWindow();
// });
