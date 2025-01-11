import { motion, AnimatePresence } from "motion/react";
import { X, CheckCircle, WarningCircle } from "@phosphor-icons/react";

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
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50">
        <div className="flex items-center justify-center min-h-screen p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-lg w-full max-w-lg border border-surface-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-surface-200">
              <h2 className="text-lg font-medium text-gray-900">
                File Operations
              </h2>
              {!hasActiveOperations && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-surface-50"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Operations List */}
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {operations.map((operation) => (
                <div key={operation.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {operation.status === "completed" ? (
                        <CheckCircle
                          className="w-5 h-5 text-green-500"
                          weight="fill"
                        />
                      ) : operation.status === "error" ? (
                        <WarningCircle
                          className="w-5 h-5 text-red-500"
                          weight="fill"
                        />
                      ) : null}
                      <span className="font-medium text-gray-900">
                        {operation.type === "copy"
                          ? "Copying files"
                          : operation.type === "move"
                          ? "Moving files"
                          : "Deleting files"}
                      </span>
                    </div>
                    {(operation.status === "pending" ||
                      operation.status === "in_progress") && (
                      <button
                        onClick={() => onCancel?.(operation.id)}
                        className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {(operation.status === "pending" ||
                    operation.status === "in_progress") && (
                    <>
                      <div className="relative h-2 bg-surface-100 rounded-full overflow-hidden">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-primary-500"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${
                              (operation.processedItems /
                                operation.totalItems) *
                              100
                            }%`,
                          }}
                          transition={{ duration: 0.2 }}
                        />
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>
                          {operation.processedItems} of {operation.totalItems}{" "}
                          items
                        </span>
                        <span>
                          {Math.round(
                            (operation.processedItems / operation.totalItems) *
                              100
                          )}
                          %
                        </span>
                      </div>
                      {operation.currentFile && (
                        <div className="text-sm text-gray-500 truncate">
                          {operation.currentFile}
                        </div>
                      )}
                    </>
                  )}

                  {/* Error Message */}
                  {operation.status === "error" && (
                    <div className="text-sm text-red-600">
                      {operation.error}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex justify-end px-4 py-3 bg-surface-50 border-t border-surface-200 rounded-b-xl">
              {hasActiveOperations ? (
                <div className="text-sm text-gray-500">
                  Operations in progress...
                </div>
              ) : (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
                >
                  Close
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
