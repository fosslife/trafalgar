import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface RenameInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export function RenameInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  inputRef,
}: RenameInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSubmit();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="min-w-0 w-full"
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onCancel}
          className="w-full px-2 py-1 text-sm bg-white border border-primary-300 
            rounded-md shadow-sm focus:outline-none focus:ring-2 
            text-center font-medium text-gray-900
            focus:ring-primary-500/20 focus:border-primary-500"
          autoFocus
        />
      </motion.div>
    </AnimatePresence>
  );
}
