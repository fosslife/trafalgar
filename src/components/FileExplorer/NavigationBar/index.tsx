import { Group, ActionIcon, Breadcrumbs, Anchor } from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconLayoutGrid,
  IconLayoutList,
} from "@tabler/icons-react";

interface NavigationBarProps {
  path: string;
  canGoBack: boolean;
  canGoForward: boolean;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onBack: () => void;
  onForward: () => void;
  onPathChange: (newPath: string) => void;
}

export function NavigationBar({
  path,
  canGoBack,
  canGoForward,
  viewMode,
  onViewModeChange,
  onBack,
  onForward,
  onPathChange,
}: NavigationBarProps) {
  // Clean up the path and split it properly
  const cleanPath = path.replace(/\\/g, "/").replace(/\/+/g, "/");
  const pathParts = cleanPath.split("/").filter(Boolean);

  const breadcrumbItems = [
    <Anchor
      key="root"
      onClick={(event) => {
        event.preventDefault();
        onPathChange("/");
      }}
      style={{ cursor: "pointer" }}
    >
      root
    </Anchor>,
  ];

  // Build cumulative paths
  pathParts.forEach((part, index) => {
    const fullPath = "/" + pathParts.slice(0, index + 1).join("/");
    breadcrumbItems.push(
      <Anchor
        key={fullPath}
        onClick={(event) => {
          event.preventDefault();
          onPathChange(fullPath);
        }}
        style={{ cursor: "pointer" }}
      >
        {part}
      </Anchor>,
    );
  });

  return (
    <Group p="2" justify="space-between" bg="gray.2">
      <Group gap="xs">
        <ActionIcon
          variant="subtle"
          disabled={!canGoBack}
          onClick={onBack}
          aria-label="Go back"
        >
          <IconChevronLeft size={16} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          disabled={!canGoForward}
          onClick={onForward}
          aria-label="Go forward"
        >
          <IconChevronRight size={16} />
        </ActionIcon>
        <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>
      </Group>
      <ActionIcon
        variant="light"
        onClick={() => onViewModeChange(viewMode === "list" ? "grid" : "list")}
      >
        {viewMode === "list" ? (
          <IconLayoutGrid size={16} />
        ) : (
          <IconLayoutList size={16} />
        )}
      </ActionIcon>
    </Group>
  );
}
