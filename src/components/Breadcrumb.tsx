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
        // Normalize the path and split by the platform-specific separator
        const normalizedPath = await normalize(path);
        const newSegments = normalizedPath
          .split(sep())
          .filter(Boolean)
          .map((segment, index, array) => ({
            name: segment,
            path: array.slice(0, index + 1).join(sep()),
          }));
        setSegments(newSegments);
      } catch (error) {
        console.error("Error normalizing path:", error);
      }
    };

    updateSegments();
  }, [path]);

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onNavigate("/")}
        className="p-1 hover:bg-gray-100 rounded-lg"
      >
        <House className="w-4 h-4" />
      </motion.button>

      {segments.map(({ name, path: segmentPath }) => (
        <div key={segmentPath} className="flex items-center space-x-2">
          <CaretRight className="w-4 h-4 text-gray-400" />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate(`/${segmentPath}`)}
            className="px-2 py-1 hover:bg-gray-100 rounded-lg"
          >
            {name}
          </motion.button>
        </div>
      ))}
    </nav>
  );
}
