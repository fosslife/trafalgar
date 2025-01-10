import { createContext, useContext, useState, ReactNode } from "react";

interface Position {
  x: number;
  y: number;
}

interface ContextMenuState {
  isOpen: boolean;
  position: Position;
  type: "default" | "selection";
  targetFile?: string;
}

interface ContextMenuContextType {
  menuState: ContextMenuState;
  openMenu: (
    position: Position,
    type: "default" | "selection",
    targetFile?: string
  ) => void;
  closeMenu: () => void;
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

  const openMenu = (
    position: Position,
    type: "default" | "selection",
    targetFile?: string
  ) => {
    setMenuState({ isOpen: true, position, type, targetFile });
  };

  const closeMenu = () => {
    setMenuState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ContextMenuContext.Provider value={{ menuState, openMenu, closeMenu }}>
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
