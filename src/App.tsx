import { MainLayout } from "./layouts/MainLayout";
import { BrowserRouter as Router } from "react-router";
import { FileGrid } from "./components/FileGrid";
import { Breadcrumb } from "./components/Breadcrumb";
import { useState, useEffect, useCallback } from "react";
import { join, normalize, sep } from "@tauri-apps/api/path";
import { ContextMenuProvider } from "./contexts/ContextMenuContext";
import {
  SquaresFour,
  List,
  CaretLeft,
  CaretRight,
  FolderPlus,
  House,
  ArrowUp,
  ArrowClockwise,
  Folder,
} from "@phosphor-icons/react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { SearchBox } from "./components/SearchBox";
import { readDir, mkdir, writeFile } from "@tauri-apps/plugin-fs";
import { NewItemDropdown } from "./components/NewItemDropdown";

type SortKey = "name" | "type" | "date";
type ViewMode = "grid" | "list";

function App() {
  const [currentPath, setCurrentPath] = useState("/");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [clipboardFiles, setClipboardFiles] = useState<{
    type: "copy" | "cut";
    files: string[];
  } | null>(null);
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>("viewMode", "grid");
  const [sortKey, setSortKey] = useLocalStorage<SortKey>("sortKey", "type");

  const handleNavigate = async (path: string) => {
    console.log("Navigating to:", path);
    try {
      // Home view
      if (path === "/" || path === "") {
        setCurrentPath("/");
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

  const handleNewFile = async () => {
    try {
      const baseName = "New File";
      let name = baseName;
      let counter = 1;

      // Get current directory contents
      const entries = await readDir(currentPath);
      const existingNames = new Set(entries.map((entry) => entry.name));

      // Find an available name
      while (existingNames.has(name)) {
        name = `${baseName} (${counter})`;
        counter++;
      }

      const newFilePath = await join(currentPath, name);
      await writeFile(newFilePath, new Uint8Array());

      // Refresh the view
      setRefreshKey((prev) => prev + 1);

      // Show success notification
      showNotification("success", "File Created", `Created file "${name}"`);
    } catch (error) {
      console.error("Error creating file:", error);
      showNotification("error", "Creation Error", "Failed to create new file");
    }
  };

  useEffect(() => {
    console.log("Current path:", currentPath);
  }, [currentPath]);

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
  onRenameFile?: (name: string) => void;
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
  onRenameFile,
}: AppContentProps) {
  // Add state for refresh key
  const [refreshKey, setRefreshKey] = useState(0);

  // Add navigation state
  const [navigationState, setNavigationState] = useState<{
    history: string[];
    currentIndex: number;
  }>({
    history: [currentPath],
    currentIndex: 0,
  });

  // Update navigation history when path changes
  useEffect(() => {
    setNavigationState((prev) => {
      // If we're already at this path, don't add it
      if (prev.history[prev.currentIndex] === currentPath) {
        return prev;
      }

      // Remove forward history when navigating to a new path
      const newHistory = prev.history.slice(0, prev.currentIndex + 1);

      return {
        history: [...newHistory, currentPath],
        currentIndex: prev.currentIndex + 1,
      };
    });
  }, [currentPath]);

  // Navigation handlers
  const handleBack = useCallback(() => {
    if (navigationState.currentIndex > 0) {
      const previousPath =
        navigationState.history[navigationState.currentIndex - 1];
      setNavigationState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex - 1,
      }));
      onNavigate(previousPath);
    }
  }, [navigationState, onNavigate]);

  const handleForward = useCallback(() => {
    if (navigationState.currentIndex < navigationState.history.length - 1) {
      const nextPath =
        navigationState.history[navigationState.currentIndex + 1];
      setNavigationState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
      }));
      onNavigate(nextPath);
    }
  }, [navigationState, onNavigate]);

  const handleUpLevel = async () => {
    if (currentPath === sep()) return; // Already at root
    const parentPath =
      currentPath.split(sep()).slice(0, -1).join(sep()) || sep();
    onNavigate(parentPath);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleHome = () => {
    onNavigate(sep());
  };

  const handleNewFolder = async () => {
    try {
      const baseName = "New Folder";
      let name = baseName;
      let counter = 1;

      const entries = await readDir(currentPath);
      const existingNames = new Set(entries.map((entry) => entry.name));

      while (existingNames.has(name)) {
        name = `${baseName} (${counter})`;
        counter++;
      }

      const newFolderPath = await join(currentPath, name);
      await mkdir(newFolderPath);

      setRefreshKey((prev) => prev + 1);
      // Trigger rename after creation
      setFileToRename(name);
    } catch (error) {
      console.error("Error creating folder:", error);
      showNotification(
        "error",
        "Creation Error",
        "Failed to create new folder"
      );
    }
  };

  // Add handleNewFile inside AppContent
  const handleNewFile = async () => {
    try {
      const baseName = "New File";
      let name = baseName;
      let counter = 1;

      const entries = await readDir(currentPath);
      const existingNames = new Set(entries.map((entry) => entry.name));

      while (existingNames.has(name)) {
        name = `${baseName} (${counter})`;
        counter++;
      }

      const newFilePath = await join(currentPath, name);
      await writeFile(newFilePath, new Uint8Array());

      setRefreshKey((prev) => prev + 1);
      // Trigger rename after creation
      setFileToRename(name);
    } catch (error) {
      console.error("Error creating file:", error);
      showNotification("error", "Creation Error", "Failed to create new file");
    }
  };

  // Also add showNotification function if it doesn't exist
  const showNotification = (
    status: "success" | "error" | "info" | "warning",
    title: string,
    message: string
  ) => {
    setNotification({ status, title, message });
  };

  // Add notification state if it doesn't exist
  const [notification, setNotification] = useState<{
    status: "success" | "error" | "info" | "warning";
    title: string;
    message: string;
  } | null>(null);

  // Add state for rename
  const [fileToRename, setFileToRename] = useState<string | null>(null);

  return (
    <div className="h-screen flex flex-col">
      {/* Top Controls Bar */}
      <div className="bg-white border-b border-surface-200">
        {/* Navigation and Controls */}
        <div className="p-3 space-y-3">
          {/* First Row: Navigation + Search */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              {/* Back/Forward group */}
              <div className="flex items-center bg-surface-50 p-1 rounded-lg space-x-1">
                <button
                  onClick={handleBack}
                  disabled={navigationState.currentIndex <= 0}
                  className={`p-1.5 rounded-md transition-colors ${
                    navigationState.currentIndex <= 0
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-500 hover:bg-surface-100"
                  }`}
                  title="Back"
                >
                  <CaretLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleForward}
                  disabled={
                    navigationState.currentIndex >=
                    navigationState.history.length - 1
                  }
                  className={`p-1.5 rounded-md transition-colors ${
                    navigationState.currentIndex >=
                    navigationState.history.length - 1
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-500 hover:bg-surface-100"
                  }`}
                  title="Forward"
                >
                  <CaretRight className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation group */}
              <div className="flex items-center bg-surface-50 p-1 rounded-lg space-x-1">
                <button
                  onClick={handleUpLevel}
                  disabled={currentPath === sep()}
                  className={`p-1.5 rounded-md transition-colors ${
                    currentPath === sep()
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-500 hover:bg-surface-100"
                  }`}
                  title="Up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={handleHome}
                  className="p-1.5 rounded-md transition-colors text-gray-500 hover:bg-surface-100"
                  title="Home"
                >
                  <House className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRefresh}
                  className="p-1.5 rounded-md transition-colors text-gray-500 hover:bg-surface-100"
                  title="Refresh"
                >
                  <ArrowClockwise className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <Breadcrumb path={currentPath} onNavigate={onNavigate} />
            </div>

            <div className="w-72 flex-shrink-0">
              <SearchBox currentPath={currentPath} onNavigate={onNavigate} />
            </div>
          </div>

          {/* Second Row: Actions + View Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {selectedFiles.size > 0 && (
                <span className="text-sm text-gray-500 bg-surface-50 px-2 py-1 rounded-md">
                  {selectedFiles.size} selected
                </span>
              )}
              <NewItemDropdown
                onNewFolder={handleNewFolder}
                onNewFile={handleNewFile}
              />
            </div>

            <div className="flex items-center space-x-3">
              <select
                className="px-3 py-1.5 text-sm bg-surface-50 rounded-lg border-0
                  focus:outline-none focus:ring-2 focus:ring-primary-500/20
                  hover:bg-surface-100 transition-colors"
                value={sortKey}
                onChange={(e) => onSortKeyChange(e.target.value as SortKey)}
              >
                <option value="name">Sort by name</option>
                <option value="type">Sort by type</option>
                <option value="date">Sort by date</option>
              </select>

              <div className="flex items-center space-x-1 bg-surface-50 p-1 rounded-lg">
                <button
                  onClick={() => onViewModeChange("grid")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "grid"
                      ? "bg-white text-primary-600 shadow-sm"
                      : "text-gray-500 hover:bg-surface-100"
                  }`}
                >
                  <SquaresFour className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onViewModeChange("list")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "list"
                      ? "bg-white text-primary-600 shadow-sm"
                      : "text-gray-500 hover:bg-surface-100"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Area with Sidebar and Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Keep the existing MainLayout for sidebar */}
        <MainLayout
          onOutsideClick={onOutsideClick}
          currentPath={currentPath}
          onNavigate={onNavigate}
        >
          <div className="flex-1 overflow-hidden">
            <FileGrid
              key={refreshKey}
              path={currentPath}
              onNavigate={onNavigate}
              selectedFiles={selectedFiles}
              onSelectedFilesChange={onSelectedFilesChange}
              viewMode={viewMode}
              sortKey={sortKey}
              fileToRename={fileToRename}
              onRenameComplete={() => setFileToRename(null)}
            />
          </div>
        </MainLayout>
      </div>
    </div>
  );
}

export default App;
