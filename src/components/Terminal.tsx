import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  currentPath: string;
  visible: boolean;
  onResize?: (rows: number, cols: number) => void;
}

export function Terminal({ currentPath, visible, onResize }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm>();
  const fitAddonRef = useRef<FitAddon>();
  const ptyIdRef = useRef<string>();

  useEffect(() => {
    if (!terminalRef.current || !visible) return;

    // Initialize xterm.js
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#d4d4d4",
        selection: "#264f78",
      },
      allowTransparency: true,
    });

    // Initialize addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Try to load WebGL addon for better performance
    try {
      const webglAddon = new WebglAddon();
      term.loadAddon(webglAddon);
    } catch (e) {
      console.warn("WebGL addon could not be loaded", e);
    }

    // Store refs
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Open terminal in container
    term.open(terminalRef.current);
    fitAddon.fit();

    // Create PTY and establish connection
    (async () => {
      try {
        // Create new PTY instance
        const ptyId = await invoke<string>("create_pty", {
          cwd: currentPath,
          rows: term.rows,
          cols: term.cols,
        });

        ptyIdRef.current = ptyId;

        // Listen for PTY output
        const unlisten = await listen<string>(
          `pty://output/${ptyId}`,
          (event) => {
            term.write(event.payload);
          }
        );

        // Handle terminal input
        term.onData((data) => {
          invoke("write_pty", {
            ptyId: ptyId,
            data: data,
          });
        });

        // Handle terminal resize
        term.onResize(({ rows, cols }) => {
          invoke("resize_pty", {
            ptyId: ptyId,
            rows: rows,
            cols: cols,
          });
          onResize?.(rows, cols);
        });

        // Initial fit
        fitAddon.fit();

        return () => {
          unlisten();
          invoke("destroy_pty", { ptyId: ptyId });
        };
      } catch (error) {
        console.error("Failed to create PTY:", error);
        term.write("\r\nFailed to start terminal: " + error);
      }
    })();

    // Cleanup
    return () => {
      term.dispose();
    };
  }, [currentPath, visible]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (visible && fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [visible]);

  // Update CWD when currentPath changes
  useEffect(() => {
    if (ptyIdRef.current) {
      invoke("set_pty_cwd", {
        ptyId: ptyIdRef.current,
        cwd: currentPath,
      });
    }
  }, [currentPath]);

  return (
    <div
      ref={terminalRef}
      className={`h-64 w-full ${visible ? "" : "hidden"}`}
      style={{ backgroundColor: "#1e1e1e" }}
    />
  );
}
