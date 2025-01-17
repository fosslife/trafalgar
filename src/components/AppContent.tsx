import { useState, useEffect, useCallback } from "react";
import { join, sep } from "@tauri-apps/api/path";
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
  ClipboardText,
  Scissors,
  TerminalWindow,
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
import { Terminal } from "./Terminal";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useTheme } from "../contexts/ThemeContext";

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

  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

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

  useEffect(() => {
    setCanGoBack(navigationState.currentIndex > 0);
    setCanGoForward(
      navigationState.currentIndex < navigationState.history.length - 1
    );
  }, [navigationState]);

  const [showTerminal, setShowTerminal] = useState(false);

  // Add keyboard shortcut
  useKeyboardShortcuts([
    {
      key: "`",
      ctrl: true,
      action: () => setShowTerminal((prev) => !prev),
    },
    {
      key: "t",
      ctrl: true,
      action: () => {
        toggleTheme();
      },
    },
  ]);

  const { toggleTheme } = useTheme();

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-surface-50">
      {/* Top Navigation Bar */}
      <div className="flex-shrink-0 flex flex-col space-y-2 p-3 border-b border-surface-200 dark:border-surface-200">
        {/* First Row: Navigation Controls + Breadcrumb + Search */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-surface-200 dark:border-surface-200 bg-white/80 dark:bg-surface-100/80 backdrop-blur-sm sticky top-0 z-10">
          {/* Left Section */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleBack}
              disabled={!canGoBack}
              className={`p-1.5 rounded-lg transition-colors
                ${
                  canGoBack
                    ? "text-gray-600 dark:text-gray-300 hover:bg-surface-100 dark:hover:bg-surface-200"
                    : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                }
              `}
            >
              <CaretLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleForward}
              disabled={!canGoForward}
              className={`p-1.5 rounded-lg transition-colors
                ${
                  canGoForward
                    ? "text-gray-600 dark:text-gray-300 hover:bg-surface-100 dark:hover:bg-surface-200"
                    : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                }
              `}
            >
              <CaretRight className="w-5 h-5" />
            </button>

            <div className="h-5 w-px bg-surface-200 mx-1" />

            <button
              onClick={handleUpLevel}
              className={`p-1.5 rounded-lg transition-colors
                ${
                  isWindows
                    ? "text-gray-600 dark:text-gray-300 hover:bg-surface-100 dark:hover:bg-surface-200"
                    : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                }
              `}
            >
              <ArrowUp className="w-5 h-5" />
            </button>

            <button
              onClick={handleRefresh}
              className={`p-1.5 rounded-lg transition-colors
                ${
                  isWindows
                    ? "text-gray-600 dark:text-gray-300 hover:bg-surface-100 dark:hover:bg-surface-200"
                    : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                }
              `}
            >
              <ArrowClockwise className="w-5 h-5" />
            </button>
          </div>

          {/* Center Section - Search */}
          <div className="flex-1 max-w-xl mx-4">
            <SearchBox currentPath={currentPath} onNavigate={onNavigate} />
          </div>

          {/* Right Section */}
        </div>

        {/* Second Row: Actions + View Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {selectedFiles.size > 0 && (
              <>
                <span className="text-sm text-gray-500 dark:text-gray-400 bg-surface-50 dark:bg-surface-200 px-2 py-1 rounded-md">
                  {selectedFiles.size} selected
                </span>
                <div className="flex items-center space-x-1 bg-surface-50 dark:bg-surface-200 p-1 rounded-lg">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-md transition-colors text-gray-500 dark:text-gray-400 hover:bg-surface-100 dark:hover:bg-surface-200"
                    title="Copy"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCut}
                    className="p-1.5 rounded-md transition-colors text-gray-500 dark:text-gray-400 hover:bg-surface-100 dark:hover:bg-surface-200"
                    title="Cut"
                  >
                    <Scissors className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
            {clipboardFiles && (
              <div className="flex items-center space-x-1 bg-surface-50 dark:bg-surface-200 p-1 rounded-lg">
                <button
                  onClick={handlePaste}
                  className="p-1.5 rounded-md transition-colors text-gray-500 dark:text-gray-400 hover:bg-surface-100 dark:hover:bg-surface-200"
                  title={`Paste ${clipboardFiles.files.length} item${
                    clipboardFiles.files.length > 1 ? "s" : ""
                  }`}
                >
                  <ClipboardText className="w-4 h-4" />
                </button>
              </div>
            )}
            <NewItemDropdown
              onNewFolder={handleNewFolder}
              onNewFile={handleNewFile}
              path={currentPath}
            />
          </div>

          <div className="flex items-center space-x-3">
            <select
              className="px-3 py-1.5 text-sm bg-surface-50 dark:bg-surface-200 rounded-lg border-0
                focus:outline-none focus:ring-2 focus:ring-primary-500/20
                hover:bg-surface-100 dark:hover:bg-surface-200 transition-colors"
              value={sortKey}
              onChange={(e) => onSortKeyChange(e.target.value as SortKey)}
            >
              <option value="name">Sort by name</option>
              <option value="type">Sort by type</option>
              <option value="date">Sort by date</option>
            </select>

            <div className="flex items-center space-x-1 bg-surface-50 dark:bg-surface-200 p-1 rounded-lg">
              <button
                onClick={() => onViewModeChange("grid")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-surface-100 text-primary-600 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:bg-surface-100 dark:hover:bg-surface-200"
                }`}
              >
                <SquaresFour className="w-4 h-4" />
              </button>
              <button
                onClick={() => onViewModeChange("list")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-white dark:bg-surface-100 text-primary-600 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:bg-surface-100 dark:hover:bg-surface-200"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Area with Sidebar and Content */}
      <div className="flex-1 flex min-h-0">
        <MainLayout
          onOutsideClick={onOutsideClick}
          currentPath={currentPath}
          onNavigate={onNavigate}
        >
          <div className="flex-1 h-full overflow-hidden flex flex-col">
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

            {/* Terminal Panel */}
            <Terminal currentPath={currentPath} visible={showTerminal} />
          </div>
        </MainLayout>
      </div>

      {/* Terminal Toggle Button */}
      <button
        onClick={() => setShowTerminal((prev) => !prev)}
        className="absolute bottom-4 right-4 p-2 bg-white dark:bg-surface-100 hover:bg-surface-50 dark:hover:bg-surface-200
          shadow-lg rounded-full border border-surface-200 dark:border-surface-300 backdrop-blur-sm
          transition-colors"
        title="Toggle Terminal"
      >
        <TerminalWindow
          weight="bold"
          className={`w-5 h-5 ${
            showTerminal
              ? "text-primary-500"
              : "text-gray-500 dark:text-gray-400"
          }`}
        />
      </button>

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
