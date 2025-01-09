import { motion } from "motion/react";
import {
  CheckCircle,
  WarningCircle,
  Info,
  XCircle,
  X,
} from "@phosphor-icons/react";

interface NotificationProps {
  status: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  onClose: () => void;
}

const statusConfig = {
  success: {
    icon: CheckCircle,
    bg: "bg-green-50",
    border: "border-green-100",
    iconColor: "text-green-500",
    titleColor: "text-green-800",
    messageColor: "text-green-600",
  },
  error: {
    icon: XCircle,
    bg: "bg-red-50",
    border: "border-red-100",
    iconColor: "text-red-500",
    titleColor: "text-red-800",
    messageColor: "text-red-600",
  },
  warning: {
    icon: WarningCircle,
    bg: "bg-yellow-50",
    border: "border-yellow-100",
    iconColor: "text-yellow-500",
    titleColor: "text-yellow-800",
    messageColor: "text-yellow-600",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-100",
    iconColor: "text-blue-500",
    titleColor: "text-blue-800",
    messageColor: "text-blue-600",
  },
};

export function Notification({
  status,
  title,
  message,
  onClose,
}: NotificationProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
      }}
      className="fixed bottom-4 right-4 z-50"
    >
      <div
        className={`flex items-start space-x-3 p-4 rounded-xl shadow-lg border
          backdrop-blur-xl ${config.bg} ${config.border}
          max-w-md w-full`}
      >
        <Icon
          weight="fill"
          className={`w-5 h-5 flex-shrink-0 ${config.iconColor}`}
        />

        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-medium ${config.titleColor}`}>
            {title}
          </h3>
          <p className={`mt-1 text-sm ${config.messageColor}`}>{message}</p>
        </div>

        <button
          onClick={onClose}
          className={`p-1 rounded-lg hover:${config.bg} 
            transition-colors ${config.messageColor}`}
        >
          <X className="w-4 h-4" />
          <span className="sr-only">Close notification</span>
        </button>
      </div>
    </motion.div>
  );
}
