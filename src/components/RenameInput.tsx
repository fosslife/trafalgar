import { useEffect, useRef } from "react";
import { motion } from "motion/react";

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
  // Get file extension if exists
  const extension = value.includes(".") ? `.${value.split(".").pop()}` : "";
  const nameWithoutExt = value.replace(extension, "");

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSubmit();
  };

  // Handle click events
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();

    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onSubmit={handleSubmit}
      onClick={handleClick}
      className="min-w-0 flex-1"
    >
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={nameWithoutExt}
          onChange={(e) => onChange(e.target.value + extension)}
          onBlur={onCancel}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1 text-sm bg-white border border-primary-500 
            rounded-lg shadow-sm
            focus:outline-none focus:ring-2 focus:ring-primary-500/20
            placeholder:text-gray-400"
          autoFocus
          selectOnFocus
        />
        {extension && (
          <span className="absolute right-2 text-sm text-gray-400">
            {extension}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-end space-x-1 text-xs">
        <span className="text-gray-400">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Enter</kbd> to
          save
        </span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-400">
          <kbd className="px-1 py-0.5 bg-gray-100 rounded">Esc</kbd> to cancel
        </span>
      </div>
    </motion.form>
  );
}
