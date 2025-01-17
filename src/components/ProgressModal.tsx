import { motion } from "motion/react";
import { X } from "@phosphor-icons/react";

export interface FileOperation {
  id: string;
  type: "copy" | "move" | "delete";
  status: "pending" | "in_progress" | "completed" | "error";
  totalItems: number;
  processedItems: number;
  currentFile?: string;
  error?: string;
}

interface ProgressModalProps {
  operations: FileOperation[];
  onClose: () => void;
  onCancel?: (operationId: string) => void;
}

export function ProgressModal({
  operations,
  onClose,
  onCancel,
}: ProgressModalProps) {
  const hasActiveOperations = operations.some(
    (op) => op.status === "pending" || op.status === "in_progress"
  );

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-xl p-4 w-96 max-w-full"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              File Operations
            </h3>
            {!hasActiveOperations && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-surface-100 text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {operations.map((operation) => (
            <div key={operation.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {operation.type === "copy" && "Copying files..."}
                  {operation.type === "move" && "Moving files..."}
                  {operation.type === "delete" && "Deleting files..."}
                </span>
                <span className="text-sm text-gray-500">
                  {operation.processedItems}/{operation.totalItems}
                </span>
              </div>

              <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${
                      (operation.processedItems / operation.totalItems) * 100
                    }%`,
                  }}
                  className={`h-full rounded-full ${
                    operation.status === "error"
                      ? "bg-red-500"
                      : operation.status === "completed"
                      ? "bg-green-500"
                      : "bg-primary-500"
                  }`}
                />
              </div>

              {operation.currentFile && (
                <div className="text-xs text-gray-500 truncate">
                  {operation.currentFile}
                </div>
              )}

              {operation.status === "error" && operation.error && (
                <div className="text-xs text-red-500 mt-1">
                  {operation.error}
                </div>
              )}

              {(operation.status === "pending" ||
                operation.status === "in_progress") &&
                onCancel && (
                  <button
                    onClick={() => onCancel(operation.id)}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    Cancel
                  </button>
                )}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
