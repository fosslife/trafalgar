import { useState, useEffect, useCallback } from "react";
import { join, normalize, sep } from "@tauri-apps/api/path";
import { readDir, mkdir, writeFile } from "@tauri-apps/plugin-fs";
import { platform } from "@tauri-apps/plugin-os";
import {
  SquaresFour,
  List,
  CaretLeft,
  CaretRight,
  ArrowUp,
  ArrowClockwise,
  Copy,
  Clipboard,
  ClipboardText,
  Scissors,
} from "@phosphor-icons/react";
import { AnimatePresence } from "framer-motion";

import { MainLayout } from "../layouts/MainLayout";
import { Breadcrumb } from "./Breadcrumb";
import { SearchBox } from "./SearchBox";
import { FileGrid } from "./FileGrid";
import { NewItemDropdown } from "./NewItemDropdown";
import { ProgressModal } from "./ProgressModal";
import { useFileOperations } from "../contexts/FileOperationsContext";
import { Notification } from "./Notification";

type ViewMode = "grid" | "list";
type SortKey = "name" | "type" | "date";

interface AppContentProps {
  currentPath: string;
  selectedFiles: Set<string>;
  viewMode: ViewMode;
  sortKey: SortKey;
  onNavigate: (path: string) => void;
  onSelectedFilesChange: (files: Set<string>) => void;
  onOutsideClick: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSortKeyChange: (key: SortKey) => void;
}

export function AppContent({
  currentPath,
  selectedFiles,
  viewMode,
  sortKey,
  onNavigate,
  onSelectedFilesChange,
  onOutsideClick,
  onViewModeChange,
  onSortKeyChange,
}: AppContentProps) {
  const {
    clipboardFiles,
    fileOperations,
    showProgress,
    notification,
    copy,
    cut,
    paste,
    closeProgressModal,
    cancelOperation,
    clearNotification,
  } = useFileOperations();

  const [refreshKey, setRefreshKey] = useState(0);
  const [fileToRename, setFileToRename] = useState<string | null>(null);
  const [isWindows, setIsWindows] = useState(false);
  const isHomePage = currentPath === "/";

  // Navigation state
  const [navigationState, setNavigationState] = useState<{
    history: string[];
    currentIndex: number;
  }>({
    history: [currentPath],
    currentIndex: 0,
  });

  // Load OS info on mount
  useEffect(() => {
    const checkPlatform = async () => {
      try {
        const os = await platform();
        setIsWindows(os === "windows");
      } catch (err) {
        console.error("Error detecting platform:", err);
      }
    };

    checkPlatform();
  }, []);

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
    if (currentPath === sep()) return;

    try {
      if (/^[A-Za-z]:[/\\]$/.test(currentPath)) {
        onNavigate("/");
        return;
      }

      const parentPath =
        currentPath.split(sep()).slice(0, -1).join(sep()) || sep();
      onNavigate(parentPath);
    } catch (error) {
      console.error("Error navigating up:", error);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleCopy = () => {
    const files = Array.from(selectedFiles);
    copy(files, currentPath);
  };

  const handleCut = () => {
    const files = Array.from(selectedFiles);
    cut(files, currentPath);
  };

  const handlePaste = async () => {
    await paste(currentPath);
    setRefreshKey((prev) => prev + 1);
  };

  // File creation handlers
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
      setFileToRename(name);
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

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
      setFileToRename(name);
    } catch (error) {
      console.error("Error creating file:", error);
    }
  };

  // Add effect to update history when path changes
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="flex-shrink-0 flex flex-col space-y-2 p-3 border-b border-surface-200">
        {/* First Row: Navigation Controls + Breadcrumb + Search */}
        <div className="flex items-center space-x-3">
          {!isHomePage && (
            <div className="flex items-center bg-surface-50 p-1 rounded-lg space-x-1">
              <button
                onClick={handleBack}
                className={`p-1.5 rounded-md transition-colors ${
                  navigationState.currentIndex > 0
                    ? "text-gray-500 hover:bg-surface-100"
                    : "text-gray-300 cursor-not-allowed"
                }`}
                title="Back"
              >
                <CaretLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleForward}
                className={`p-1.5 rounded-md transition-colors ${
                  navigationState.currentIndex <
                  navigationState.history.length - 1
                    ? "text-gray-500 hover:bg-surface-100"
                    : "text-gray-300 cursor-not-allowed"
                }`}
                title="Forward"
              >
                <CaretRight className="w-4 h-4" />
              </button>

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
                onClick={handleRefresh}
                className="p-1.5 rounded-md transition-colors text-gray-500 hover:bg-surface-100"
                title="Refresh"
              >
                <ArrowClockwise className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <Breadcrumb path={currentPath} onNavigate={onNavigate} />
          </div>

          <div className="w-72 flex-shrink-0">
            <SearchBox currentPath={currentPath} onNavigate={onNavigate} />
          </div>
        </div>

        {/* Second Row: Actions + View Controls */}
        {!isHomePage && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {selectedFiles.size > 0 && (
                <>
                  <span className="text-sm text-gray-500 bg-surface-50 px-2 py-1 rounded-md">
                    {selectedFiles.size} selected
                  </span>
                  <div className="flex items-center space-x-1 bg-surface-50 p-1 rounded-lg">
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded-md transition-colors text-gray-500 hover:bg-surface-100"
                      title="Copy"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCut}
                      className="p-1.5 rounded-md transition-colors text-gray-500 hover:bg-surface-100"
                      title="Cut"
                    >
                      <Scissors className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
              {clipboardFiles && (
                <div className="flex items-center space-x-1 bg-surface-50 p-1 rounded-lg">
                  <button
                    onClick={handlePaste}
                    className="p-1.5 rounded-md transition-colors text-gray-500 hover:bg-surface-100"
                    title={`Paste ${clipboardFiles.files.length} item${
                      clipboardFiles.files.length > 1 ? "s" : ""
                    }`}
                  >
                    <ClipboardText className="w-4 h-4" />
                  </button>
                </div>
              )}
              {(isWindows || currentPath !== "/") && (
                <NewItemDropdown
                  onNewFolder={handleNewFolder}
                  onNewFile={handleNewFile}
                />
              )}
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
        )}
      </div>

      {/* Main Area with Sidebar and Content */}
      <div className="flex-1 flex min-h-0">
        <MainLayout
          onOutsideClick={onOutsideClick}
          currentPath={currentPath}
          onNavigate={onNavigate}
        >
          <div className="flex-1 h-full overflow-hidden">
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

      {showProgress && (
        <ProgressModal
          operations={fileOperations}
          onClose={closeProgressModal}
          onCancel={cancelOperation}
        />
      )}

      <AnimatePresence>
        {notification && (
          <Notification
            status={notification.status}
            title={notification.title}
            message={notification.message}
            onClose={clearNotification}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
