import { createContext, useContext, ReactNode, useState } from "react";
import { ContextMenu } from "../components/ContextMenu";

interface Position {
  x: number;
  y: number;
}

interface ContextMenuState {
  show: boolean;
  position: Position;
  canPaste: boolean;
  hasSelection: boolean;
}

interface ContextMenuContextType {
  contextMenu: ContextMenuState;
  showContextMenu: (props: Omit<ContextMenuState, "show">) => void;
  hideContextMenu: () => void;
  handleCopy: () => void;
  handleCut: () => void;
  handlePaste: () => void;
  handleDelete: () => void;
  handleRename: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextType | null>(null);

export function ContextMenuProvider({
  children,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onRename,
}: {
  children: ReactNode;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false,
    position: { x: 0, y: 0 },
    canPaste: false,
    hasSelection: false,
  });

  const showContextMenu = (props: Omit<ContextMenuState, "show">) => {
    setContextMenu({ ...props, show: true });
  };

  const hideContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, show: false }));
  };

  return (
    <ContextMenuContext.Provider
      value={{
        contextMenu,
        showContextMenu,
        hideContextMenu,
        handleCopy: onCopy,
        handleCut: onCut,
        handlePaste: onPaste,
        handleDelete: onDelete,
        handleRename: onRename,
      }}
    >
      {children}
      <ContextMenu
        show={contextMenu.show}
        position={contextMenu.position}
        onClose={hideContextMenu}
        onCopy={onCopy}
        onCut={onCut}
        onPaste={onPaste}
        onDelete={onDelete}
        onRename={onRename}
        canPaste={contextMenu.canPaste}
        hasSelection={contextMenu.hasSelection}
      />
    </ContextMenuContext.Provider>
  );
}

export function useContextMenu() {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error("useContextMenu must be used within a ContextMenuProvider");
  }
  return context;
}
