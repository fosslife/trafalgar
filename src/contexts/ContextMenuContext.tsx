import { createContext, useContext, ReactNode, useState } from "react";
import { IconProps } from "@phosphor-icons/react";
import { ContextMenu } from "../components/ContextMenu";

// Types
type IconComponent = React.ForwardRefExoticComponent<
  IconProps & React.RefAttributes<SVGSVGElement>
>;

export type MenuType = "file" | "empty" | "multiple";

export interface MenuItem {
  id: string;
  label: string;
  icon: IconComponent;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string;
  divider?: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface ContextMenuState {
  show: boolean;
  position: Position;
  type: MenuType;
  items: MenuItem[];
}

interface ContextMenuContextType {
  showMenu: (props: {
    position: Position;
    type: MenuType;
    items: MenuItem[];
  }) => void;
  hideMenu: () => void;
  state: ContextMenuState;
}

// Context
const ContextMenuContext = createContext<ContextMenuContextType | null>(null);

// Provider
interface ContextMenuProviderProps {
  children: ReactNode;
}

export function ContextMenuProvider({ children }: ContextMenuProviderProps) {
  const [state, setState] = useState<ContextMenuState>({
    show: false,
    position: { x: 0, y: 0 },
    type: "empty",
    items: [],
  });

  const showMenu = ({
    position,
    type,
    items,
  }: {
    position: Position;
    type: MenuType;
    items: MenuItem[];
  }) => {
    // First hide existing menu
    setState((prev) => ({ ...prev, show: false }));

    // Show new menu in next frame
    requestAnimationFrame(() => {
      setState({
        show: true,
        position,
        type,
        items,
      });
    });
  };

  const hideMenu = () => {
    setState((prev) => ({ ...prev, show: false }));
  };

  return (
    <ContextMenuContext.Provider
      value={{
        showMenu,
        hideMenu,
        state,
      }}
    >
      {children}
      <ContextMenu
        show={state.show}
        position={state.position}
        items={state.items}
        onClose={hideMenu}
      />
    </ContextMenuContext.Provider>
  );
}

// Hook
export function useContextMenu() {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error("useContextMenu must be used within ContextMenuProvider");
  }
  return context;
}
