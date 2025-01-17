import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";

interface Position {
  x: number;
  y: number;
}

interface ContextMenuState {
  isOpen: boolean;
  position: Position;
  type: "default" | "selection";
  targetFile?: string;
  path?: string;
}

interface ContextMenuContextType {
  menuState: ContextMenuState;
  openMenu: (
    position: Position,
    type: "default" | "selection",
    targetFile?: string,
    path?: string
  ) => void;
  closeMenu: () => void;
  updatePosition: (position: { x: number; y: number }) => void;
}

const ContextMenuContext = createContext<ContextMenuContextType | undefined>(
  undefined
);

export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [menuState, setMenuState] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    type: "default",
  });

  const updatePosition = useCallback((position: { x: number; y: number }) => {
    setMenuState((prev) => ({ ...prev, position }));
  }, []);

  // Add click event listener to close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click was outside the context menu
      const contextMenu = document.querySelector('[role="menu"]');
      if (
        menuState.isOpen &&
        contextMenu &&
        !contextMenu.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    // Add the event listener
    document.addEventListener("mousedown", handleClickOutside);

    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuState.isOpen]);

  const openMenu = (
    position: Position,
    type: "default" | "selection",
    targetFile?: string,
    path?: string
  ) => {
    setMenuState({ isOpen: true, position, type, targetFile, path });
  };

  const closeMenu = () => {
    setMenuState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ContextMenuContext.Provider
      value={{ menuState, openMenu, closeMenu, updatePosition }}
    >
      {children}
    </ContextMenuContext.Provider>
  );
}

export const useContextMenu = () => {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error("useContextMenu must be used within a ContextMenuProvider");
  }
  return context;
};
