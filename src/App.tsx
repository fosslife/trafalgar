import { MainLayout } from "./layouts/MainLayout";
import { BrowserRouter as Router } from "react-router";
import { FileGrid } from "./components/FileGrid";
import { Breadcrumb } from "./components/Breadcrumb";
import { useState, useEffect } from "react";
import { join, normalize, sep } from "@tauri-apps/api/path";
import {
  ContextMenuProvider,
  useContextMenu,
} from "./contexts/ContextMenuContext";

function App() {
  const [currentPath, setCurrentPath] = useState("/");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [clipboardFiles, setClipboardFiles] = useState<{
    type: "copy" | "cut";
    files: string[];
  } | null>(null);

  const handleNavigate = async (path: string) => {
    try {
      // If it's root path, use platform-specific root
      if (path === "/") {
        setCurrentPath(sep());
        return;
      }

      // If it's an absolute path (from breadcrumb), use it directly
      if (path.startsWith("/")) {
        const normalized = await normalize(path);
        setCurrentPath(
          normalized.startsWith("\\\\") ? normalized.slice(2) : normalized
        );
      } else {
        // For relative navigation (from FileGrid), join with current path
        const newPath = await join(currentPath, path);
        const normalized = await normalize(newPath);
        setCurrentPath(
          normalized.startsWith("\\\\") ? normalized.slice(2) : normalized
        );
      }
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  const handleOutsideClick = () => {
    setSelectedFiles(new Set());
  };

  const handleCopy = () => {
    const files = Array.from(selectedFiles);
    setClipboardFiles({ type: "copy", files });
  };

  const handleCut = () => {
    const files = Array.from(selectedFiles);
    setClipboardFiles({ type: "cut", files });
  };

  const handlePaste = async () => {
    // We'll use the FileGrid's paste handler
  };

  const handleDelete = async () => {
    // We'll use the FileGrid's delete handler
  };

  const handleRename = async () => {
    // We'll use the FileGrid's rename handler
  };

  // Add useEffect for global context menu prevention
  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", preventDefault);
    return () => document.removeEventListener("contextmenu", preventDefault);
  }, []);

  return (
    <Router>
      <ContextMenuProvider
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onDelete={handleDelete}
        onRename={handleRename}
      >
        <AppContent
          currentPath={currentPath}
          selectedFiles={selectedFiles}
          clipboardFiles={clipboardFiles}
          onNavigate={handleNavigate}
          onSelectedFilesChange={setSelectedFiles}
          onOutsideClick={handleOutsideClick}
        />
      </ContextMenuProvider>
    </Router>
  );
}

interface AppContentProps {
  currentPath: string;
  selectedFiles: Set<string>;
  clipboardFiles: { type: "copy" | "cut"; files: string[] } | null;
  onNavigate: (path: string) => void;
  onSelectedFilesChange: (files: Set<string>) => void;
  onOutsideClick: () => void;
}

function AppContent({
  currentPath,
  selectedFiles,
  clipboardFiles,
  onNavigate,
  onSelectedFilesChange,
  onOutsideClick,
}: AppContentProps) {
  const { showContextMenu } = useContextMenu();

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    showContextMenu({
      position: { x: event.pageX, y: event.pageY },
      canPaste: !!clipboardFiles,
      hasSelection: selectedFiles.size > 0,
    });
  };

  return (
    <div className="bg-red-500 min-h-screen" onContextMenu={handleContextMenu}>
      <MainLayout onOutsideClick={onOutsideClick}>
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Files</h1>
          </div>
          <div className="mt-4">
            <Breadcrumb path={currentPath} onNavigate={onNavigate} />
          </div>
          <FileGrid
            path={currentPath}
            onNavigate={onNavigate}
            selectedFiles={selectedFiles}
            onSelectedFilesChange={onSelectedFilesChange}
          />
        </div>
      </MainLayout>
    </div>
  );
}

export default App;
