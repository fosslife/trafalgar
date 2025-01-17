import { motion } from "motion/react";
import { Warning } from "@phosphor-icons/react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-surface-100 rounded-xl shadow-xl p-4 w-[400px] max-w-full"
        >
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Warning
                weight="fill"
                className="w-5 h-5 text-yellow-600 dark:text-yellow-500"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {message}
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 
                hover:bg-gray-100 dark:hover:bg-surface-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-3 py-1.5 text-sm text-white bg-yellow-500 
                hover:bg-yellow-600 rounded-lg transition-colors"
            >
              Proceed
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
