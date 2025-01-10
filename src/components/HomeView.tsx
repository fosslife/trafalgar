import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { HardDrive } from "@phosphor-icons/react";
import { invoke } from "@tauri-apps/api/core";
import { formatFileSize, filterDrives } from "../utils/fileUtils";

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

type DriveGroup = {
  type: "fixed" | "removable" | "network" | "cdRom" | "unknown";
  title: string;
  drives: DriveInfo[];
};

// Add a helper function to calculate percentage
const calculateUsedPercentage = (total: number, available: number) => {
  const used = total - available;
  return Math.round((used / total) * 100);
};

export function HomeView({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const loadDrives = async () => {
      try {
        console.log("Loading drives...");
        const list = await invoke<DriveInfo[]>("list_drives");
        const drivesList = filterDrives(list);
        console.log("Drives loaded:", drivesList);
        const sortedDrives = [...drivesList].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setDrives(sortedDrives);
      } catch (err) {
        console.error("Error loading drives:", err);
        setError(err as string);
      }
    };

    loadDrives();
  }, []);

  const driveGroups = useMemo<DriveGroup[]>(() => {
    const groups: DriveGroup[] = [
      { type: "fixed", title: "Local Drives", drives: [] },
      { type: "removable", title: "Removable Storage", drives: [] },
      { type: "network", title: "Network Drives", drives: [] },
      { type: "cdRom", title: "CD/DVD Drives", drives: [] },
    ];

    drives.forEach((drive) => {
      const group = groups.find((g) => g.type === drive.driveType);
      if (group) {
        group.drives.push(drive);
      }
    });

    // Only show groups that have drives
    return groups.filter((group) => group.drives.length > 0);
  }, [drives]);

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-amber-500";
    return "bg-primary-500";
  };

  if (error) {
    return (
      <div className="p-6 text-red-500">Error loading drives: {error}</div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">
        Storage Devices
      </h1>

      <div className="space-y-8">
        {driveGroups.map((group) => (
          <div key={group.type}>
            <h2 className="text-sm font-medium text-gray-500 mb-3">
              {group.title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.drives.map((drive) => {
                const usedPercentage = calculateUsedPercentage(
                  drive.totalSpace,
                  drive.availableSpace
                );
                const usageColor = getUsageColor(usedPercentage);

                return (
                  <motion.button
                    key={drive.path}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => onNavigate(drive.path)}
                    className="flex flex-col p-3 bg-white rounded-xl border border-surface-200 
                      hover:border-surface-300 transition-colors shadow-sm relative group"
                  >
                    {/* File System Pill */}
                    {drive.fileSystem && (
                      <div
                        className="absolute top-2 right-2 px-2 py-0.5 
                          bg-surface-100 rounded-full
                          text-xs text-gray-500
                          opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {drive.fileSystem}
                      </div>
                    )}

                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-surface-50 rounded-lg">
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
                              : "text-gray-400"
                          }`}
                          weight="fill"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <h3 className="font-medium text-gray-900 truncate">
                            {drive.name}
                          </h3>
                          {drive.volumeName && (
                            <span className="text-xs text-gray-500 truncate">
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
                          className={`absolute left-0 h-full ${usageColor}`}
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

                      <div className="flex justify-between text-xs text-gray-500">
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
