import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useTheme } from "../contexts/ThemeContext";
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
  const { theme } = useTheme();

  useEffect(() => {
    if (!terminalRef.current || !visible) return;

    // Initialize xterm.js with theme-aware colors
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: theme === "light" ? "#ffffff" : "#111111",
        foreground: theme === "light" ? "#374151" : "#e5e7eb",
        cursor: theme === "light" ? "#374151" : "#e5e7eb",
        black: theme === "light" ? "#374151" : "#1f2937",
        red: "#dc2626",
        green: "#059669",
        yellow: "#d97706",
        blue: "#3b82f6",
        magenta: "#7c3aed",
        cyan: "#0891b2",
        white: theme === "light" ? "#374151" : "#f3f4f6",
        brightBlack: theme === "light" ? "#6b7280" : "#4b5563",
        brightRed: "#ef4444",
        brightGreen: "#10b981",
        brightYellow: "#f59e0b",
        brightBlue: "#60a5fa",
        brightMagenta: "#8b5cf6",
        brightCyan: "#06b6d4",
        brightWhite: theme === "light" ? "#111827" : "#ffffff",
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
  }, [currentPath, visible, theme]);

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
      className={`h-64 w-full ${visible ? "" : "hidden"} ${
        theme === "light" ? "bg-white" : "bg-[#1e1e1e]"
      }`}
    />
  );
}
