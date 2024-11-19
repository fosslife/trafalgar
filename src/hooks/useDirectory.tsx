import { useState, useEffect } from "react";
import { readDir, DirEntry } from "@tauri-apps/plugin-fs";

interface UseDirectoryResult {
  entries: DirEntry[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useDirectory(path: string): UseDirectoryResult {
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadDirectory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const contents = await readDir(path);
      setEntries(contents);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err : new Error("Failed to read directory")
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, [path]);

  return {
    entries,
    isLoading,
    error,
    refresh: loadDirectory,
  };
}
