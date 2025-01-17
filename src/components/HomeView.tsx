import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { HardDrive } from "@phosphor-icons/react";
import { invoke } from "@tauri-apps/api/core";
import { formatFileSize, filterDrives } from "../utils/fileUtils";
import { platform } from "@tauri-apps/plugin-os";

export interface DriveInfo {
  name: string;
  path: string;
  driveType: "fixed" | "removable" | "network" | "cdRom" | "unknown";
  totalSpace: number;
  availableSpace: number;
  isRemovable: boolean;
  fileSystem: string;
  volumeName?: string;
}

function calculateUsedPercentage(total: number, available: number): number {
  if (total === 0) return 0;
  return Math.round(((total - available) / total) * 100);
}

function getUsageColor(percentage: number): { backgroundColor: string } {
  if (percentage <= 20) {
    return { backgroundColor: "#38bdf8" }; // primary-400 - very safe
  } else if (percentage <= 40) {
    return { backgroundColor: "#0ea5e9" }; // primary-500 - safe
  } else if (percentage <= 60) {
    return { backgroundColor: "#0284c7" }; // primary-600 - moderate
  } else if (percentage <= 75) {
    return { backgroundColor: "#f97316" }; // orange-500 - warning
  } else if (percentage <= 90) {
    return { backgroundColor: "#f43f5e" }; // rose-500 - concerning
  } else {
    return { backgroundColor: "#ef4444" }; // red-500 - danger
  }
}

function groupDrives(drives: DriveInfo[]) {
  const groups = {
    fixed: { type: "fixed", title: "Fixed Drives", drives: [] as DriveInfo[] },
    removable: {
      type: "removable",
      title: "Removable Devices",
      drives: [] as DriveInfo[],
    },
    network: {
      type: "network",
      title: "Network Drives",
      drives: [] as DriveInfo[],
    },
    other: { type: "other", title: "Other Devices", drives: [] as DriveInfo[] },
  };

  drives.forEach((drive) => {
    switch (drive.driveType) {
      case "fixed":
        groups.fixed.drives.push(drive);
        break;
      case "removable":
      case "cdRom":
        groups.removable.drives.push(drive);
        break;
      case "network":
        groups.network.drives.push(drive);
        break;
      default:
        groups.other.drives.push(drive);
    }
  });

  // Only return groups that have drives
  return Object.values(groups).filter((group) => group.drives.length > 0);
}

export function HomeView({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDrive, setSelectedDrive] = useState<string | null>(null);

  useEffect(() => {
    const loadDrives = async () => {
      try {
        setLoading(true);
        const driveList = await invoke<DriveInfo[]>("list_drives");
        setDrives(filterDrives(driveList));
      } catch (err) {
        console.error("Error loading drives:", err);
        setError("Failed to load drives");
      } finally {
        setLoading(false);
      }
    };

    loadDrives();
  }, []);

  const handleDriveClick = (drive: DriveInfo) => {
    setSelectedDrive(drive.path);
  };

  const handleDriveDoubleClick = (drive: DriveInfo) => {
    onNavigate(drive.path);
  };

  const driveGroups = groupDrives(drives);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="animate-pulse text-gray-400"
        >
          Loading drives...
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-500"
        >
          {error}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
        Storage Devices
      </h1>

      <div className="space-y-8">
        {driveGroups.map((group) => (
          <div key={group.type}>
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              {group.title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.drives.map((drive) => {
                const usedPercentage = calculateUsedPercentage(
                  drive.totalSpace,
                  drive.availableSpace
                );
                const usageColor = getUsageColor(usedPercentage);
                const isSelected = selectedDrive === drive.path;

                return (
                  <motion.button
                    key={drive.path}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => handleDriveClick(drive)}
                    onDoubleClick={() => handleDriveDoubleClick(drive)}
                    className={`flex flex-col p-3 bg-white dark:bg-surface-100 rounded-xl border 
                      hover:border-surface-300 dark:hover:border-surface-300 transition-colors shadow-sm relative group
                      ${
                        isSelected
                          ? "border-primary-500 ring-1 ring-primary-500/20"
                          : "border-surface-200 dark:border-surface-200"
                      }`}
                  >
                    {/* File System Pill */}
                    {drive.fileSystem && (
                      <div
                        className="absolute top-2 right-2 px-2 py-0.5 
                          bg-surface-100 dark:bg-surface-200 rounded-full
                          text-xs text-gray-500 dark:text-gray-400
                          opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {drive.fileSystem}
                      </div>
                    )}

                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-surface-50 dark:bg-surface-200 rounded-lg">
                        <HardDrive
                          className={`w-6 h-6 ${
                            drive.driveType === "fixed"
                              ? "text-primary-500"
                              : drive.driveType === "removable"
                              ? "text-green-500"
                              : drive.driveType === "network"
                              ? "text-blue-500"
                              : drive.driveType === "cdRom"
                              ? "text-amber-500"
                              : "text-gray-400 dark:text-gray-500"
                          }`}
                          weight="fill"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {drive.name}
                          </h3>
                          {drive.volumeName && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              ({drive.volumeName})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <div className="relative h-1.5 w-full rounded-full overflow-hidden group">
                        {/* Total capacity track */}
                        <div className="absolute inset-0 bg-surface-100 border border-surface-200" />

                        {/* Used space */}
                        <motion.div
                          className="absolute left-0 h-full"
                          style={getUsageColor(usedPercentage)}
                          initial={{ width: 0 }}
                          animate={{ width: `${usedPercentage}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />

                        {/* Capacity markers */}
                        <div className="absolute inset-0 w-full">
                          {[25, 50, 75].map((mark) => (
                            <div
                              key={mark}
                              className="absolute top-0 bottom-0 w-px bg-surface-300/30"
                              style={{ left: `${mark}%` }}
                            />
                          ))}
                        </div>

                        {/* Tooltip */}
                        <div
                          className="absolute invisible group-hover:visible
                            -top-6 left-1/2 -translate-x-1/2 px-2 py-1
                            bg-gray-900 text-white text-xs rounded-md whitespace-nowrap
                            pointer-events-none z-10"
                        >
                          {usedPercentage}% of{" "}
                          {formatFileSize(drive.totalSpace)}
                        </div>
                      </div>

                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          {formatFileSize(
                            drive.totalSpace - drive.availableSpace
                          )}
                          <span className="mx-1">used</span>
                        </span>
                        <span>
                          {formatFileSize(drive.availableSpace)}
                          <span className="ml-1">free</span>
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
