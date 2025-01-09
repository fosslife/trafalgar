import { useEffect, useCallback } from "react";

type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
};

type MouseNavigation = {
  onForward?: () => void;
  onBack?: () => void;
};

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  navigation?: MouseNavigation
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      for (const shortcut of shortcuts) {
        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          (!shortcut.ctrl || isCtrlOrCmd) &&
          (!shortcut.shift || event.shiftKey) &&
          (!shortcut.alt || event.altKey)
        ) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  const handleMouseNavigation = useCallback(
    (event: MouseEvent) => {
      // Mouse button 3 and 4 are typically back/forward buttons
      if (event.button === 3 && navigation?.onBack) {
        event.preventDefault();
        navigation.onBack();
      } else if (event.button === 4 && navigation?.onForward) {
        event.preventDefault();
        navigation.onForward();
      }
    },
    [navigation]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mouseup", handleMouseNavigation);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mouseup", handleMouseNavigation);
    };
  }, [handleKeyDown, handleMouseNavigation]);
}
