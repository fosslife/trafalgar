import { motion } from "motion/react";
import { CaretRight, House } from "@phosphor-icons/react";
import { sep, normalize } from "@tauri-apps/api/path";
import { useEffect, useState } from "react";

interface BreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

interface Segment {
  name: string;
  path: string;
}

export function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  const [segments, setSegments] = useState<Segment[]>([]);

  useEffect(() => {
    const updateSegments = async () => {
      try {
        const normalizedPath = await normalize(path);
        const parts = normalizedPath.split(sep()).filter(Boolean);

        // If we have a drive letter (Windows), handle it specially
        if (/^[A-Za-z]:/.test(normalizedPath)) {
          const driveLetter = normalizedPath.split(sep())[0];
          // Filter out any duplicate drive letters from parts array
          const pathParts = parts.filter((part) => part !== driveLetter);

          const newSegments = [
            { name: driveLetter, path: driveLetter },
            ...pathParts.map((segment, index) => ({
              name: segment,
              // Build path including drive letter
              path: [driveLetter, ...pathParts.slice(0, index + 1)].join(sep()),
            })),
          ];
          setSegments(newSegments);
        } else {
          // For non-Windows paths
          const newSegments = parts.map((segment, index, array) => ({
            name: segment,
            path: array.slice(0, index + 1).join(sep()),
          }));
          setSegments(newSegments);
        }
      } catch (error) {
        console.error("Error normalizing path:", error);
      }
    };

    updateSegments();
  }, [path]);

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600">
      {segments.map(({ name, path: segmentPath }, index) => (
        <div key={segmentPath} className="flex items-center space-x-2">
          {index > 0 && <CaretRight className="w-4 h-4 text-gray-400" />}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate(segmentPath)}
            className="px-2 py-1 hover:bg-gray-100 rounded-lg"
          >
            {name}
          </motion.button>
        </div>
      ))}
    </nav>
  );
}
