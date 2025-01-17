import { createContext, useContext, useState, ReactNode } from "react";
import { join } from "@tauri-apps/api/path";
import { copyFile, remove, lstat, mkdir, readDir } from "@tauri-apps/plugin-fs";
import { v4 as uuidv4 } from "uuid";
import { emit } from "../utils/eventUtils";

export interface FileOperation {
  id: string;
  type: "copy" | "move" | "delete";
  status: "pending" | "in_progress" | "completed" | "error";
  totalItems: number;
  processedItems: number;
  currentFile?: string;
  error?: string;
}

interface ClipboardFiles {
  type: "copy" | "cut";
  files: string[];
  sourcePath: string;
}

interface NotificationState {
  status: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
}

interface FileOperationsContextType {
  // State
  clipboardFiles: ClipboardFiles | null;
  fileOperations: FileOperation[];
  showProgress: boolean;
  notification: NotificationState | null;

  // Operations
  copy: (files: string[], sourcePath: string) => void;
  cut: (files: string[], sourcePath: string) => void;
  paste: (destinationPath: string, onComplete?: () => void) => Promise<void>;
  delete: (files: string[], sourcePath: string) => Promise<void>;
  rename: (oldPath: string, newPath: string) => Promise<void>;

  // Progress Modal
  closeProgressModal: () => void;
  cancelOperation: (operationId: string) => void;
  clearNotification: () => void;
}

const FileOperationsContext = createContext<
  FileOperationsContextType | undefined
>(undefined);

export function FileOperationsProvider({ children }: { children: ReactNode }) {
  const [clipboardFiles, setClipboardFiles] = useState<ClipboardFiles | null>(
    null
  );
  const [fileOperations, setFileOperations] = useState<FileOperation[]>([]);
  const [showProgress, setShowProgress] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(
    null
  );

  const addFileOperation = (
    type: "copy" | "move" | "delete",
    totalItems: number
  ): string => {
    const operationId = uuidv4();
    setFileOperations((prev) => [
      ...prev,
      {
        id: operationId,
        type,
        status: "pending",
        totalItems,
        processedItems: 0,
      },
    ]);
    setShowProgress(true);
    return operationId;
  };

  const updateFileOperation = (
    operationId: string,
    update: Partial<FileOperation>
  ) => {
    setFileOperations((prev) =>
      prev.map((op) => (op.id === operationId ? { ...op, ...update } : op))
    );
  };

  const copy = (files: string[], sourcePath: string) => {
    setClipboardFiles({ type: "copy", files, sourcePath });
  };

  const cut = (files: string[], sourcePath: string) => {
    setClipboardFiles({ type: "cut", files, sourcePath });
  };

  const paste = async (destinationPath: string, onComplete?: () => void) => {
    console.log("Starting paste operation:", {
      clipboardFiles,
      destinationPath,
    });

    if (!clipboardFiles) {
      console.log("No files in clipboard");
      return;
    }

    // For copying to same directory, automatically add "(Copy)" suffix
    const isSameDirectory =
      clipboardFiles.type === "copy" &&
      clipboardFiles.sourcePath === destinationPath;

    const operationId = addFileOperation(
      clipboardFiles.type === "copy" ? "copy" : "move",
      clipboardFiles.files.length
    );

    try {
      for (const [index, fileName] of clipboardFiles.files.entries()) {
        const sourcePath = await join(clipboardFiles.sourcePath, fileName);

        // If same directory, add "(Copy)" suffix for initial attempt
        let initialName = fileName;
        if (isSameDirectory) {
          const ext = fileName.includes(".")
            ? "." + fileName.split(".").pop()
            : "";
          const baseName = fileName.includes(".")
            ? fileName.substring(0, fileName.lastIndexOf("."))
            : fileName;
          initialName = `${baseName} (Copy)${ext}`;
        }

        const destPath = await join(destinationPath, initialName);
        console.log("Processing file:", { sourcePath, destPath });

        updateFileOperation(operationId, {
          status: "in_progress",
          processedItems: index,
          currentFile: fileName,
        });

        let finalDestPath = destPath;
        let counter = 1;
        const MAX_ATTEMPTS = 100;

        const tryCreateUniquePath = async () => {
          const ext = initialName.includes(".")
            ? "." + initialName.split(".").pop()
            : "";
          const baseName = initialName.includes(".")
            ? initialName.substring(0, initialName.lastIndexOf("."))
            : initialName;
          // For same directory copies, use "Copy 2", "Copy 3" etc.
          const suffix = isSameDirectory ? `Copy ${counter + 1}` : `${counter}`;
          return await join(destinationPath, `${baseName} (${suffix})${ext}`);
        };

        while (counter < MAX_ATTEMPTS) {
          try {
            console.log("Attempting to copy to:", finalDestPath);
            const stats = await lstat(sourcePath);

            if (stats.isDirectory) {
              // For directories, create the directory first
              console.log("Creating directory:", finalDestPath);
              await mkdir(finalDestPath);

              // Then copy contents
              const entries = await readDir(sourcePath);
              console.log("Copying directory contents:", entries);

              for (const entry of entries) {
                const sourceEntryPath = await join(sourcePath, entry.name);
                const destEntryPath = await join(finalDestPath, entry.name);
                await copyFile(sourceEntryPath, destEntryPath, {
                  recursive: true,
                  overwrite: false,
                });
              }
            } else {
              // For files, use simple copy
              await copyFile(sourcePath, finalDestPath, {
                recursive: false,
                overwrite: false,
              });
            }

            console.log("Copy successful");
            break;
          } catch (error) {
            console.error("Copy attempt failed:", error);

            // Increment counter and try with a new name
            counter++;
            if (counter >= MAX_ATTEMPTS) {
              throw new Error(`Failed to copy after ${MAX_ATTEMPTS} attempts`);
            }

            finalDestPath = await tryCreateUniquePath();
          }
        }

        // If this was a cut operation, delete the source file
        if (clipboardFiles.type === "cut") {
          console.log("Cut operation - deleting source:", sourcePath);
          await remove(sourcePath, { recursive: true });
        }
      }

      console.log("All files processed successfully");
      updateFileOperation(operationId, {
        status: "completed",
        processedItems: clipboardFiles.files.length,
      });

      // Clear clipboard after successful cut operation
      if (clipboardFiles.type === "cut") {
        setClipboardFiles(null);
      }

      // Emit the event for file operation completion
      emit("fileOperation", {
        type: clipboardFiles.type === "copy" ? "copy" : "move",
        status: "completed",
        path: destinationPath,
      });

      // Show success notification
      setNotification({
        status: "success",
        title: "Operation Complete",
        message: `Successfully ${
          clipboardFiles.type === "copy" ? "copied" : "moved"
        } ${clipboardFiles.files.length} item${
          clipboardFiles.files.length > 1 ? "s" : ""
        }`,
      });

      // Call onComplete callback if provided
      onComplete?.();

      // Close modal and show notification when complete
      closeProgressModal();
    } catch (error) {
      console.error("Error during paste operation:", error);
      updateFileOperation(operationId, {
        status: "error",
        error: "Failed to complete operation",
      });

      // Show error notification
      setNotification({
        status: "error",
        title: "Operation Failed",
        message: "Failed to complete the paste operation. Please try again.",
      });

      // Close modal even on error
      closeProgressModal();
    }
  };

  const deleteFiles = async (files: string[], sourcePath: string) => {
    console.log("Starting delete operation:", { files, sourcePath });
    const operationId = addFileOperation("delete", files.length);

    try {
      for (const [index, fileName] of files.entries()) {
        const filePath = await join(sourcePath, fileName);
        console.log("Attempting to delete:", filePath);

        updateFileOperation(operationId, {
          status: "in_progress",
          processedItems: index,
          currentFile: fileName,
        });

        await remove(filePath, { recursive: true });
        console.log("Successfully deleted:", filePath);
      }

      console.log("All files deleted successfully");
      updateFileOperation(operationId, {
        status: "completed",
        processedItems: files.length,
      });

      // Emit the event for file operation completion
      console.log("Emitting fileOperation event");
      emit("fileOperation", {
        type: "delete",
        status: "completed",
        path: sourcePath,
      });

      // Show success notification
      setNotification({
        status: "success",
        title: "Delete Complete",
        message: `Successfully deleted ${files.length} item${
          files.length > 1 ? "s" : ""
        }`,
      });

      // Close modal and show notification when complete
      closeProgressModal();
    } catch (error) {
      console.error("Error in delete operation:", error);
      updateFileOperation(operationId, {
        status: "error",
        error: "Failed to delete one or more files",
      });

      // Show error notification
      setNotification({
        status: "error",
        title: "Delete Failed",
        message: "Failed to delete one or more files. Please try again.",
      });

      // Close modal even on error
      closeProgressModal();
    }
  };

  const rename = async (oldPath: string, newPath: string) => {
    try {
      await rename(oldPath, newPath);
    } catch (error) {
      console.error("Error renaming file:", error);
      throw error;
    }
  };

  const closeProgressModal = () => {
    const hasActiveOperations = fileOperations.some(
      (op) => op.status === "pending" || op.status === "in_progress"
    );
    if (!hasActiveOperations) {
      setShowProgress(false);
      setFileOperations([]);
      // Show success notification
      const completedOps = fileOperations.filter(
        (op) => op.status === "completed"
      );
      if (completedOps.length > 0) {
        setNotification({
          status: "success",
          title: "Operation Complete",
          message: `Successfully completed ${
            completedOps.length
          } file operation${completedOps.length > 1 ? "s" : ""}`,
        });
      }
    }
  };

  const cancelOperation = (operationId: string) => {
    updateFileOperation(operationId, {
      status: "error",
      error: "Operation cancelled",
    });
  };

  const clearNotification = () => {
    setNotification(null);
  };

  return (
    <FileOperationsContext.Provider
      value={{
        clipboardFiles,
        fileOperations,
        showProgress,
        notification,
        copy,
        cut,
        paste,
        delete: deleteFiles,
        rename,
        closeProgressModal,
        cancelOperation,
        clearNotification,
      }}
    >
      {children}
    </FileOperationsContext.Provider>
  );
}

export const useFileOperations = () => {
  const context = useContext(FileOperationsContext);
  if (!context) {
    throw new Error(
      "useFileOperations must be used within a FileOperationsProvider"
    );
  }
  return context;
};
