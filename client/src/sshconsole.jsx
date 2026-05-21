import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

import "xterm/css/xterm.css";

export default function SSHConsole({ host, username, password, onClose }) {

  const terminalRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#111111",
      },
      fontSize: 14,
    });

    const fitAddon = new FitAddon();

    term.loadAddon(fitAddon);

    term.open(terminalRef.current);

    fitAddon.fit();

    // Connect to websocket backend
    const socket = new WebSocket(
      `ws://localhost:3001/ssh?host=${encodeURIComponent(host.split(":")[0])}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
    );

    socketRef.current = socket;

    socket.onopen = () => {
      term.writeln(`Connected to ${host.split(":")[0]}`);
    };

    socket.onmessage = (event) => {
      term.write(event.data);
    };

    socket.onclose = () => {
      term.writeln("\r\nConnection closed.");
    };

    term.onData((data) => {
      socket.send(data);
    });

    window.addEventListener("resize", () => {
      fitAddon.fit();
    });

    return () => {
      socket.close();
      term.dispose();
    };

  }, [host]);

  return (
    <div
      style={{
        position: "fixed",
        top: 50,
        left: 50,
        right: 50,
        bottom: 50,
        background: "#111",
        border: "1px solid #444",
        borderRadius: "10px",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "40px",
          background: "#222",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px",
          color: "white",
        }}
      >
        <span>SSH Console - {host.split(":")[0]}</span>

        <button
          onClick={onClose}
          style={{
            background: "red",
            color: "white",
            border: "none",
            padding: "5px 10px",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>

      <div
        ref={terminalRef}
        style={{
          width: "100%",
          height: "calc(100% - 40px)",
        }}
      />
    </div>
  );
}