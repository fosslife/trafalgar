import { MainLayout } from "./layouts/MainLayout";
import { BrowserRouter as Router } from "react-router";
import { FileGrid } from "./components/FileGrid";
import { Breadcrumb } from "./components/Breadcrumb";
import { useState } from "react";
import { join, normalize, sep } from "@tauri-apps/api/path";
import { ContextMenuProvider } from "./contexts/ContextMenuContext";
import { SquaresFour, List } from "@phosphor-icons/react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { SearchBox } from "./components/SearchBox";

type SortKey = "name" | "type" | "date";
type ViewMode = "grid" | "list";

function App() {
  const [currentPath, setCurrentPath] = useLocalStorage<string>(
    "defaultPath",
    "D:\\"
  );
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [clipboardFiles, setClipboardFiles] = useState<{
    type: "copy" | "cut";
    files: string[];
  } | null>(null);
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>("viewMode", "grid");
  const [sortKey, setSortKey] = useLocalStorage<SortKey>("sortKey", "type");

  const handleNavigate = async (path: string) => {
    try {
      // If it's root path, use platform-specific root
      if (path === "/") {
        setCurrentPath(sep());
        return;
      }

      // If path starts with a drive letter (like D:/), it's absolute
      if (/^[A-Za-z]:/.test(path)) {
        const normalized = await normalize(path);
        setCurrentPath(normalized);
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

  const handleSort = (key: "name" | "type") => {
    setSortKey(key);
  };

  return (
    <Router>
      <ContextMenuProvider>
        <AppContent
          currentPath={currentPath}
          selectedFiles={selectedFiles}
          clipboardFiles={clipboardFiles}
          viewMode={viewMode}
          sortKey={sortKey}
          onNavigate={handleNavigate}
          onSelectedFilesChange={setSelectedFiles}
          onOutsideClick={handleOutsideClick}
          onViewModeChange={setViewMode}
          onSortKeyChange={setSortKey}
        />
      </ContextMenuProvider>
    </Router>
  );
}

interface AppContentProps {
  currentPath: string;
  selectedFiles: Set<string>;
  clipboardFiles: { type: "copy" | "cut"; files: string[] } | null;
  viewMode: ViewMode;
  sortKey: SortKey;
  onNavigate: (path: string) => void;
  onSelectedFilesChange: (files: Set<string>) => void;
  onOutsideClick: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSortKeyChange: (key: SortKey) => void;
}

function AppContent({
  currentPath,
  selectedFiles,
  clipboardFiles,
  viewMode,
  sortKey,
  onNavigate,
  onSelectedFilesChange,
  onOutsideClick,
  onViewModeChange,
  onSortKeyChange,
}: AppContentProps) {
  return (
    <div className="min-h-screen bg-red-500">
      <MainLayout onOutsideClick={onOutsideClick}>
        <div className="flex flex-col h-full">
          <div className="mb-4 space-y-4">
            <SearchBox currentPath={currentPath} onNavigate={onNavigate} />
            <Breadcrumb path={currentPath} onNavigate={onNavigate} />
          </div>

          <div className="bg-gray-50 border-y border-gray-200 py-2 px-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <select
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={sortKey}
                  onChange={(e) => onSortKeyChange(e.target.value as SortKey)}
                >
                  <option value="name">Sort by name</option>
                  <option value="type">Sort by type</option>
                  <option value="date">Sort by date</option>
                </select>
                {selectedFiles.size > 0 && (
                  <span className="text-sm text-gray-500">
                    {selectedFiles.size} selected
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onViewModeChange("grid")}
                  className={`p-1.5 rounded-lg ${
                    viewMode === "grid"
                      ? "bg-white border border-gray-200 shadow-sm"
                      : "hover:bg-white"
                  }`}
                >
                  <SquaresFour className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => onViewModeChange("list")}
                  className={`p-1.5 rounded-lg ${
                    viewMode === "list"
                      ? "bg-white border border-gray-200 shadow-sm"
                      : "hover:bg-white"
                  }`}
                >
                  <List className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 mt-4 overflow-auto">
            <FileGrid
              path={currentPath}
              onNavigate={onNavigate}
              selectedFiles={selectedFiles}
              onSelectedFilesChange={onSelectedFilesChange}
              viewMode={viewMode}
              sortKey={sortKey}
            />
          </div>
        </div>
      </MainLayout>
    </div>
  );
}

export default App;
