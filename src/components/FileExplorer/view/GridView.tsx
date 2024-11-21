import { FileItem } from "@/lib/fileUtils";
import { Box, SimpleGrid } from "@mantine/core";
import { FileCard } from "../components/FileCard";

interface GridViewProps {
  fileItems: FileItem[];
  selectedItems: Set<string>;
  editingItem: string | null;
  editValue: string;
  handleRowClick: (item: FileItem, event: React.MouseEvent) => void;
  handleDoubleClick: (item: FileItem) => void;
  handleContextMenu: (e: React.MouseEvent, item: FileItem) => void;
  handleRenameSubmit: (item: FileItem, value: string) => void;
  setEditingItem: (item: string | null) => void;
  setEditValue: (value: string) => void;
}

export function GridView({
  fileItems,
  selectedItems,
  editingItem,
  editValue,
  handleRowClick,
  handleDoubleClick,
  handleContextMenu,
  handleRenameSubmit,
  setEditingItem,
  setEditValue,
}: GridViewProps) {
  return (
    <Box style={{ height: "calc(100% - 64px)", overflow: "auto" }}>
      <SimpleGrid
        cols={{ base: 2, xs: 3, sm: 4, md: 5, lg: 6 }}
        spacing="md"
        p="md"
      >
        {fileItems.map((item) => (
          <FileCard
            key={item.name}
            item={item}
            selected={selectedItems.has(item.name)}
            onSelect={handleRowClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={(e) => handleContextMenu(e, item)}
            handleRenameSubmit={handleRenameSubmit}
            setEditingItem={setEditingItem}
            setEditValue={setEditValue}
            editingItem={editingItem}
            editValue={editValue}
          />
        ))}
      </SimpleGrid>
    </Box>
  );
}
