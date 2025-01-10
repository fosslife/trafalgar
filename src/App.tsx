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
import { platform } from "@tauri-apps/plugin-os";
import { homeDir } from "@tauri-apps/api/path";
import { info, error, debug } from "@tauri-apps/plugin-log";
import { Notification } from "./components/Notification";

type SortKey = "name" | "type" | "date";
type ViewMode = "grid" | "list";
type NavigationType = "home" | "drive" | "folder";

interface NavigationState {
  type: NavigationType;
  path: string;
  history: Array<{ type: NavigationType; path: string }>;
  currentIndex: number;
  platform: "windows" | "linux" | "macos" | "unknown";
}

interface NavigationHandlers {
  navigate: (path: string, type?: NavigationType) => Promise<void>;
  navigateBack: () => void;
  navigateForward: () => void;
  navigateUp: () => Promise<void>;
  navigateHome: () => Promise<void>;
  navigateToRoot: () => Promise<void>;
}

function App() {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [clipboardFiles, setClipboardFiles] = useState<{
    type: "copy" | "cut";
    files: string[];
  } | null>(null);
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>("viewMode", "grid");
  const [sortKey, setSortKey] = useLocalStorage<SortKey>("sortKey", "type");
  const [refreshKey, setRefreshKey] = useState(0);
  const [notification, setNotification] = useState<{
    status: "success" | "error" | "info" | "warning";
    title: string;
    message: string;
  } | null>(null);
  const [fileToRename, setFileToRename] = useState<string | null>(null);
  const [navigationState, setNavigationState] = useState<NavigationState>({
    type: "home",
    path: "/",
    history: [{ type: "home", path: "/" }],
    currentIndex: 0,
    platform: "unknown",
  });

  const navigationHandlers = useCallback((): NavigationHandlers => {
    const navigate = async (path: string, type?: NavigationType) => {
      try {
        const isUnixLike =
          navigationState.platform === "linux" ||
          navigationState.platform === "macos";

        // Determine navigation type if not provided
        if (!type) {
          if (path === "home" || path === "/") {
            type = "home";
          } else if (/^[A-Za-z]:[/\\]?$/.test(path)) {
            type = "drive";
          } else {
            type = "folder";
          }
        }

        let normalizedPath = path;
        if (type === "drive" && !isUnixLike) {
          normalizedPath = path.endsWith(sep()) ? path : path + sep();
        } else if (type === "folder") {
          if (path.startsWith("/") || /^[A-Za-z]:/.test(path)) {
            normalizedPath = await normalize(path);
          } else {
            const joined = await join(navigationState.path, path);
            normalizedPath = await normalize(joined);
          }
        }

        // Always show actual contents for folder type
        setNavigationState((prev) => ({
          ...prev,
          type,
          path: normalizedPath,
          history: [
            ...prev.history.slice(0, prev.currentIndex + 1),
            { type, path: normalizedPath },
          ],
          currentIndex: prev.currentIndex + 1,
        }));
      } catch (err) {
        error(
          `Navigation failed: ${JSON.stringify({
            path,
            type,
            error: String(err),
            stack: (err as Error).stack,
          })}`
        );
      }
    };

    const navigateBack = () => {
      if (navigationState.currentIndex > 0) {
        const previous =
          navigationState.history[navigationState.currentIndex - 1];
        setNavigationState((prev) => ({
          ...prev,
          currentIndex: prev.currentIndex - 1,
          type: previous.type,
          path: previous.path,
        }));
      }
    };

    const navigateForward = () => {
      if (navigationState.currentIndex < navigationState.history.length - 1) {
        const next = navigationState.history[navigationState.currentIndex + 1];
        setNavigationState((prev) => ({
          ...prev,
          currentIndex: prev.currentIndex + 1,
          type: next.type,
          path: next.path,
        }));
      }
    };

    const navigateUp = async () => {
      try {
        if (navigationState.path === "/" || navigationState.path === sep()) {
          return; // Already at root
        }

        const parentPath =
          navigationState.path.split(sep()).slice(0, -1).join(sep()) || sep();

        const normalized = await normalize(parentPath);

        // Determine if we're navigating to home
        const isHome = normalized === "/" || normalized === sep();
        await navigate(normalized, isHome ? "home" : "folder");
      } catch (err) {
        error(`Navigate up failed: ${String(err)}`);
      }
    };

    const navigateHome = async () => {
      await navigate("/", "home");
    };

    const navigateToRoot = async () => {
      const isUnixLike =
        navigationState.platform === "linux" ||
        navigationState.platform === "macos";

      if (isUnixLike) {
        await navigate("/", "folder");
      } else {
        await navigateHome();
      }
    };

    return {
      navigate,
      navigateBack,
      navigateForward,
      navigateUp,
      navigateHome,
      navigateToRoot,
    };
  }, [
    navigationState.platform,
    navigationState.path,
    navigationState.currentIndex,
    navigationState.history,
  ]);

  // Initialize platform on mount
  useEffect(() => {
    const initPlatform = async () => {
      try {
        const os = await platform();
        setNavigationState((prev) => ({
          ...prev,
          platform: os as NavigationState["platform"],
        }));
      } catch (err) {
        error("Failed to detect platform:", err);
      }
    };
    initPlatform();
  }, []);

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

  const showNotification = (
    status: "success" | "error" | "info" | "warning",
    title: string,
    message: string
  ) => {
    setNotification({ status, title, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Keep the debug effect
  useEffect(() => {
    debug(
      `Path changed: ${JSON.stringify({ currentPath: navigationState.path })}`
    );
  }, [navigationState.path]);

  return (
    <Router>
      <ContextMenuProvider>
        <AppContent
          {...navigationHandlers()}
          currentPath={navigationState.path}
          selectedFiles={selectedFiles}
          clipboardFiles={clipboardFiles}
          viewMode={viewMode}
          sortKey={sortKey}
          refreshKey={refreshKey}
          fileToRename={fileToRename}
          showHomeView={navigationState.type === "home"}
          onNavigate={navigationHandlers().navigate}
          onSelectedFilesChange={setSelectedFiles}
          onOutsideClick={handleOutsideClick}
          onViewModeChange={setViewMode}
          onSortKeyChange={setSortKey}
          onRefresh={() => setRefreshKey((prev) => prev + 1)}
          onShowNotification={showNotification}
          onFileRename={setFileToRename}
        />
        {notification && (
          <Notification
            status={notification.status}
            title={notification.title}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}
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
  refreshKey: number;
  fileToRename: string | null;
  showHomeView: boolean;
  onNavigate: (path: string, type?: "home" | "drive" | "folder") => void;
  onSelectedFilesChange: (files: Set<string>) => void;
  onOutsideClick: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSortKeyChange: (key: SortKey) => void;
  onRefresh: () => void;
  onShowNotification: (
    status: "success" | "error" | "info" | "warning",
    title: string,
    message: string
  ) => void;
  onFileRename: (name: string | null) => void;
  navigateUp: () => Promise<void>;
  navigateBack: () => void;
  navigateForward: () => void;
}

function AppContent({
  currentPath,
  selectedFiles,
  clipboardFiles,
  viewMode,
  sortKey,
  refreshKey,
  fileToRename,
  showHomeView,
  onNavigate,
  onSelectedFilesChange,
  onOutsideClick,
  onViewModeChange,
  onSortKeyChange,
  onRefresh,
  onShowNotification,
  onFileRename,
  navigateUp,
  navigateBack,
  navigateForward,
}: AppContentProps) {
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

  // Keep this platform check in AppContent where it's used
  const [isWindows, setIsWindows] = useState(false);
  const isHomePage = currentPath === "/";

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

  const handleNewFolder = async () => {
    try {
      const baseName = "New Folder";
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

      const newFolderPath = await join(currentPath, name);
      await mkdir(newFolderPath);

      // Refresh the view
      onRefresh();
      // Trigger rename operation
      onFileRename(name);

      onShowNotification(
        "success",
        "Folder Created",
        `Created folder "${name}"`
      );
    } catch (err) {
      error(
        `Error creating folder: ${JSON.stringify({
          path: currentPath,
          error: String(err),
          stack: (err as Error).stack,
        })}`
      );
      onShowNotification(
        "error",
        "Creation Error",
        "Failed to create new folder"
      );
    }
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
      onRefresh();
      // Trigger rename operation
      onFileRename(name);

      onShowNotification("success", "File Created", `Created file "${name}"`);
    } catch (err) {
      error(
        `Error creating file: ${JSON.stringify({
          path: currentPath,
          error: String(err),
          stack: (err as Error).stack,
        })}`
      );
      onShowNotification(
        "error",
        "Creation Error",
        "Failed to create new file"
      );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Navigation Bar */}
      <div className="flex flex-col space-y-2 p-3 border-b border-surface-200">
        {/* First Row: Navigation Controls + Breadcrumb + Search */}
        <div className="flex items-center space-x-3">
          {!isHomePage && (
            <div className="flex items-center bg-surface-50 p-1 rounded-lg space-x-1">
              <button
                onClick={navigateUp}
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
                onClick={onRefresh}
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
                <span className="text-sm text-gray-500 bg-surface-50 px-2 py-1 rounded-md">
                  {selectedFiles.size} selected
                </span>
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
              showHomeView={showHomeView}
              onNavigate={onNavigate}
              selectedFiles={selectedFiles}
              onSelectedFilesChange={onSelectedFilesChange}
              viewMode={viewMode}
              sortKey={sortKey}
              fileToRename={fileToRename}
              onRenameComplete={() => onFileRename(null)}
            />
          </div>
        </MainLayout>
      </div>
    </div>
  );
}

export default App;
