import { FileItem } from "@/lib/fileUtils";
import { Box, SimpleGrid } from "@mantine/core";
import { FileCard } from "../components/FileCard";

interface GridViewProps {
  fileItems: FileItem[];
  selectedItems: Set<string>;
  handleRowClick: (item: FileItem, event: React.MouseEvent) => void;
  handleDoubleClick: (item: FileItem) => void;
  handleContextMenu: (e: React.MouseEvent, item: FileItem) => void;
}

export function GridView({
  fileItems,
  selectedItems,
  handleRowClick,
  handleDoubleClick,
  handleContextMenu,
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
          />
        ))}
      </SimpleGrid>
    </Box>
  );
}
