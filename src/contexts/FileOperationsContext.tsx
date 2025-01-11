import { createContext, useContext, useState, ReactNode } from "react";
import { join } from "@tauri-apps/api/path";
import { copyFile, remove } from "@tauri-apps/plugin-fs";
import { v4 as uuidv4 } from "uuid";

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
    if (!clipboardFiles) return;

    const operationId = addFileOperation(
      clipboardFiles.type === "copy" ? "copy" : "move",
      clipboardFiles.files.length
    );

    try {
      for (const [index, fileName] of clipboardFiles.files.entries()) {
        const sourcePath = await join(clipboardFiles.sourcePath, fileName);
        const destPath = await join(destinationPath, fileName);

        updateFileOperation(operationId, {
          status: "in_progress",
          processedItems: index,
          currentFile: fileName,
        });

        // Handle name conflicts
        let finalDestPath = destPath;
        let counter = 1;
        while (true) {
          try {
            await copyFile(sourcePath, finalDestPath);
            break;
          } catch {
            const ext = fileName.includes(".")
              ? "." + fileName.split(".").pop()
              : "";
            const baseName = fileName.includes(".")
              ? fileName.substring(0, fileName.lastIndexOf("."))
              : fileName;
            finalDestPath = await join(
              destinationPath,
              `${baseName} (${counter})${ext}`
            );
            counter++;
          }
        }

        // If this was a cut operation, delete the source file
        if (clipboardFiles.type === "cut") {
          await remove(sourcePath);
        }
      }

      updateFileOperation(operationId, {
        status: "completed",
        processedItems: clipboardFiles.files.length,
      });

      // Clear clipboard after successful cut operation
      if (clipboardFiles.type === "cut") {
        setClipboardFiles(null);
      }

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
      // Close modal even on error
      closeProgressModal();
      setNotification({
        status: "error",
        title: "Operation Failed",
        message: "Failed to complete the operation. Please try again.",
      });
    }
  };

  const deleteFiles = async (files: string[], sourcePath: string) => {
    const operationId = addFileOperation("delete", files.length);

    try {
      for (const [index, fileName] of files.entries()) {
        const filePath = await join(sourcePath, fileName);

        updateFileOperation(operationId, {
          status: "in_progress",
          processedItems: index,
          currentFile: fileName,
        });

        await remove(filePath);
      }

      updateFileOperation(operationId, {
        status: "completed",
        processedItems: files.length,
      });

      // Close modal and show notification when complete
      closeProgressModal();
    } catch (error) {
      console.error("Error deleting files:", error);
      updateFileOperation(operationId, {
        status: "error",
        error: "Failed to delete one or more files",
      });
      // Close modal even on error
      closeProgressModal();
      setNotification({
        status: "error",
        title: "Operation Failed",
        message: "Failed to complete the operation. Please try again.",
      });
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
