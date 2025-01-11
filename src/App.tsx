import { useState } from "react";
import { BrowserRouter as Router } from "react-router";
import { ContextMenuProvider } from "./contexts/ContextMenuContext";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { AppContent } from "./components/AppContent";
import { join, normalize, sep } from "@tauri-apps/api/path";
import { platform } from "@tauri-apps/plugin-os";
import { FileOperationsProvider } from "./contexts/FileOperationsContext";

type SortKey = "name" | "type" | "date";
type ViewMode = "grid" | "list";

function App() {
  const [currentPath, setCurrentPath] = useState("/");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>("viewMode", "grid");
  const [sortKey, setSortKey] = useLocalStorage<SortKey>("sortKey", "type");

  const handleNavigate = async (path: string) => {
    console.log("Navigating to:", path);
    try {
      // For root path, handle platform-specific behavior
      if (path === "/" || path === "") {
        const os = await platform();
        if (os === "linux" || os === "macos") {
          setCurrentPath("/");
        } else {
          setCurrentPath("/");
        }
        return;
      }

      // Windows drive paths (e.g., "C:", "C:\", "D:\")
      if (/^[A-Za-z]:[/\\]?$/.test(path)) {
        const drivePath = path.endsWith(sep()) ? path : path + sep();
        setCurrentPath(drivePath);
        return;
      }

      // Other absolute paths
      if (path.startsWith("/") || /^[A-Za-z]:/.test(path)) {
        const normalized = await normalize(path);
        setCurrentPath(normalized);
        return;
      }

      // Relative paths
      const newPath = await join(currentPath, path);
      const normalized = await normalize(newPath);
      setCurrentPath(normalized);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  const handleOutsideClick = () => {
    setSelectedFiles(new Set());
  };

  return (
    <Router>
      <ContextMenuProvider>
        <FileOperationsProvider>
          <AppContent
            currentPath={currentPath}
            selectedFiles={selectedFiles}
            viewMode={viewMode}
            sortKey={sortKey}
            onNavigate={handleNavigate}
            onSelectedFilesChange={setSelectedFiles}
            onOutsideClick={handleOutsideClick}
            onViewModeChange={setViewMode}
            onSortKeyChange={setSortKey}
          />
        </FileOperationsProvider>
      </ContextMenuProvider>
    </Router>
  );
}

export default App;
