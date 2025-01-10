import { useState, useEffect } from "react";
import {
  CaretRight,
  HardDrive,
  Folder,
  House,
  File,
  DownloadSimple,
  Image,
  MusicNotes,
  VideoCamera,
  Desktop,
  Code,
} from "@phosphor-icons/react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "motion/react";
import { readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import {
  homeDir,
  downloadDir,
  documentDir,
  pictureDir,
  desktopDir,
  videoDir,
  audioDir,
  publicDir,
} from "@tauri-apps/api/path";
import { platform } from "@tauri-apps/plugin-os";
import { filterDrives } from "../utils/fileUtils";
import { DriveInfo } from "./HomeView";

interface FolderInfo {
  name: string;
  path: string;
}

interface TreeNodeProps {
  name: string;
  path: string;
  icon?: React.ReactNode;
  isActive: boolean;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onNavigate: (path: string) => void;
  onToggle?: () => void;
  children?: React.ReactNode;
}

function TreeNode({
  name,
  path,
  icon,
  isActive,
  hasChildren,
  isExpanded,
  onNavigate,
  onToggle,
  children,
}: TreeNodeProps) {
  return (
    <div>
      <motion.div
        className="flex items-center"
        whileHover={{ x: hasChildren ? 0 : 2 }}
      >
        {hasChildren && (
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-surface-100 text-gray-400"
          >
            <CaretRight
              className={`w-3 h-3 transition-transform ${
                isExpanded ? "transform rotate-90" : ""
              }`}
            />
          </button>
        )}
        <button
          onClick={() => onNavigate(path)}
          className={`flex-1 flex items-center space-x-2 px-2 py-1.5 rounded-lg
            text-sm transition-colors text-left
            ${
              isActive
                ? "bg-primary-50 text-primary-600"
                : "hover:bg-surface-100 text-gray-600"
            }`}
        >
          <span className={isActive ? "text-primary-500" : "text-gray-500"}>
            {icon || <Folder className="w-4 h-4" />}
          </span>
          <span className="truncate">{name}</span>
        </button>
      </motion.div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-4 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FolderTreeProps {
  path: string;
  currentPath: string;
  onNavigate: (path: string) => void;
  level?: number;
}

function FolderTree({
  path,
  currentPath,
  onNavigate,
  level = 0,
}: FolderTreeProps) {
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(false);

  const loadFolders = async () => {
    if (level > 2) return; // Limit initial depth
    try {
      setIsLoading(true);
      const entries = await readDir(path);
      const folderList = await Promise.all(
        entries
          .filter((entry) => entry.isDirectory)
          .map(async (entry) => ({
            name: entry.name,
            path: await join(path, entry.name),
          }))
      );

      setFolders(folderList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Error loading folders:", err, { path });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, [path]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  if (isLoading) {
    return <div className="py-1 px-2 text-xs text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-0.5">
      {folders.map((folder) => (
        <TreeNode
          key={folder.path}
          name={folder.name}
          path={folder.path}
          icon={<Folder className="w-4 h-4" />}
          isActive={currentPath === folder.path}
          hasChildren={true}
          isExpanded={expandedFolders.has(folder.path)}
          onNavigate={onNavigate}
          onToggle={() => toggleFolder(folder.path)}
        >
          {expandedFolders.has(folder.path) && (
            <FolderTree
              path={folder.path}
              currentPath={currentPath}
              onNavigate={onNavigate}
              level={level + 1}
            />
          )}
        </TreeNode>
      ))}
    </div>
  );
}

interface TreeViewProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

interface UserDirectory {
  name: string;
  path: string;
  icon: React.ReactNode;
}

async function checkPathExists(path: string): Promise<boolean> {
  try {
    await readDir(path);
    return true;
  } catch {
    return false;
  }
}

export function TreeView({ currentPath, onNavigate }: TreeViewProps) {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [expandedDrives, setExpandedDrives] = useState<Set<string>>(new Set());
  const [userDirs, setUserDirs] = useState<UserDirectory[]>([]);
  const [isUnix, setIsUnix] = useState(false);

  useEffect(() => {
    const initializePath = async () => {
      try {
        const os = await platform();
        const isUnixLike = os === "linux" || os === "macos";
        setIsUnix(isUnixLike);

        if (isUnixLike && currentPath === "/") {
          const home = await homeDir();
          onNavigate(home);
        }
      } catch (err) {
        console.error("Error setting initial path:", err);
      }
    };

    initializePath();
  }, []);

  useEffect(() => {
    const loadPlatformSpecifics = async () => {
      try {
        const os = await platform();
        const isUnixLike = os === "linux" || os === "macos";
        setIsUnix(isUnixLike);

        const dirs: UserDirectory[] = [];

        // Common directories with existence check
        const commonDirs = [
          {
            path: await homeDir(),
            name: "Home",
            icon: <House weight="fill" className="w-4 h-4" color="#6366f1" />,
          },
          {
            path: await desktopDir(),
            name: "Desktop",
            icon: <Desktop weight="fill" className="w-4 h-4" color="#8b5cf6" />,
          },
          {
            path: await documentDir(),
            name: "Documents",
            icon: <File weight="fill" className="w-4 h-4" color="#3b82f6" />,
          },
          {
            path: await downloadDir(),
            name: "Downloads",
            icon: (
              <DownloadSimple
                weight="fill"
                className="w-4 h-4"
                color="#10b981"
              />
            ),
          },
          {
            path: await pictureDir(),
            name: "Pictures",
            icon: <Image weight="fill" className="w-4 h-4" color="#f97316" />,
          },
          {
            path: await videoDir(),
            name: "Videos",
            icon: (
              <VideoCamera weight="fill" className="w-4 h-4" color="#ef4444" />
            ),
          },
          {
            path: await audioDir(),
            name: "Music",
            icon: (
              <MusicNotes weight="fill" className="w-4 h-4" color="#ec4899" />
            ),
          },
        ];

        // Platform-specific directories
        if (isUnixLike) {
          if (os === "linux") {
            // Linux-specific directories
            const linuxDirs = [
              {
                path: await join(await homeDir(), ".config"),
                name: "Config",
                icon: (
                  <Code weight="fill" className="w-4 h-4" color="#0ea5e9" />
                ),
              },
              {
                path: await publicDir(),
                name: "Public",
                icon: (
                  <Folder weight="fill" className="w-4 h-4" color="#14b8a6" />
                ),
              },
              {
                path: "/usr/local",
                name: "Local",
                icon: (
                  <Folder weight="fill" className="w-4 h-4" color="#8b5cf6" />
                ),
              },
            ];

            for (const dir of linuxDirs) {
              if (await checkPathExists(dir.path)) {
                dirs.push(dir);
              }
            }
          } else if (os === "macos") {
            // macOS-specific directories
            const macosDirs = [
              {
                path: "/Applications",
                name: "Applications",
                icon: (
                  <Folder weight="fill" className="w-4 h-4" color="#6366f1" />
                ),
              },
              {
                path: await join(await homeDir(), "Library"),
                name: "Library",
                icon: (
                  <Folder weight="fill" className="w-4 h-4" color="#8b5cf6" />
                ),
              },
              {
                path: await join("/Users", "Shared"),
                name: "Shared",
                icon: (
                  <Folder weight="fill" className="w-4 h-4" color="#14b8a6" />
                ),
              },
            ];

            for (const dir of macosDirs) {
              if (await checkPathExists(dir.path)) {
                dirs.push(dir);
              }
            }
          }
        } else {
          // Windows-specific directories
          const windowsDirs = [
            {
              path: await join(await homeDir(), "AppData"),
              name: "AppData",
              icon: <Code weight="fill" className="w-4 h-4" color="#0ea5e9" />,
            },
          ];

          for (const dir of windowsDirs) {
            if (await checkPathExists(dir.path)) {
              dirs.push(dir);
            }
          }
        }

        // Add common directories that exist
        for (const dir of commonDirs) {
          if (await checkPathExists(dir.path)) {
            dirs.push(dir);
          }
        }

        // Sort directories by name
        dirs.sort((a, b) => a.name.localeCompare(b.name));
        setUserDirs(dirs);
      } catch (err) {
        console.error("Error detecting platform:", err);
      }
    };

    loadPlatformSpecifics();
  }, []);

  useEffect(() => {
    const loadDrives = async () => {
      try {
        const driveList = await invoke<DriveInfo[]>("list_drives");
        const filteredDrives = filterDrives(driveList);
        const sortedDrives = [...filteredDrives].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setDrives(sortedDrives);
      } catch (err) {
        console.error("Error loading drives:", err);
      }
    };

    loadDrives();
  }, []);

  const getDriveIcon = (type: string) => {
    return (
      <HardDrive
        className="w-4 h-4"
        weight="fill"
        color={
          type === "fixed"
            ? "#6366f1"
            : type === "removable"
            ? "#10b981"
            : type === "network"
            ? "#3b82f6"
            : type === "cdRom"
            ? "#f59e0b"
            : "#9ca3af"
        }
      />
    );
  };

  const toggleDrive = (drivePath: string) => {
    setExpandedDrives((prev) => {
      const next = new Set(prev);
      if (next.has(drivePath)) {
        next.delete(drivePath);
      } else {
        next.add(drivePath);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* User Directories Section */}
      <div className="space-y-1">
        <div className="px-3 py-2">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {isUnix ? "Locations" : "Quick Access"}
          </h3>
        </div>
        <div className="space-y-0.5 px-3">
          {userDirs.map((dir) => (
            <TreeNode
              key={dir.path}
              name={dir.name}
              path={dir.path}
              icon={dir.icon}
              isActive={currentPath === dir.path}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>

      {/* Drives Section */}
      <div className="space-y-1">
        <div className="px-3 py-2">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Drives
          </h3>
        </div>
        <div className="space-y-0.5 px-3">
          {drives.map((drive) => {
            // Special handling for Linux root drive
            const displayName =
              isUnix && drive.path === "/"
                ? "Root"
                : drive.volumeName
                ? `${drive.name} (${drive.volumeName})`
                : drive.name;

            const drivePath = drive.path.endsWith("/")
              ? drive.path
              : `${drive.path}/`;

            // For Linux root drive, we'll handle the click differently
            const handleDriveClick = () => {
              // Always navigate to the drive path directly
              onNavigate(drivePath);
            };

            return (
              <TreeNode
                key={drive.path}
                name={displayName}
                path={drivePath}
                icon={getDriveIcon(drive.driveType)}
                isActive={
                  isUnix
                    ? currentPath.startsWith(drivePath)
                    : currentPath === drivePath
                }
                hasChildren={true}
                isExpanded={expandedDrives.has(drive.path)}
                onNavigate={handleDriveClick}
                onToggle={() => toggleDrive(drive.path)}
              >
                {expandedDrives.has(drive.path) && (
                  <FolderTree
                    path={drivePath}
                    currentPath={currentPath}
                    onNavigate={onNavigate}
                  />
                )}
              </TreeNode>
            );
          })}
        </div>
      </div>
    </div>
  );
}
