import { Paper, Text, Stack, UnstyledButton } from "@mantine/core";
import { FileItem } from "@/lib/fileUtils";
import { getFileIcon } from "../../utils/getFileIcon";
import classes from "./FileCard.module.css";
import { IconFolder } from "@tabler/icons-react";

interface FileCardProps {
  item: FileItem;
  selected: boolean;
  onSelect: (item: FileItem, event: React.MouseEvent) => void;
  onDoubleClick: (item: FileItem) => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

export function FileCard({
  item,
  selected,
  onSelect,
  onDoubleClick,
  onContextMenu,
}: FileCardProps) {
  return (
    <UnstyledButton
      onClick={(e) => onSelect(item, e)}
      onDoubleClick={() => onDoubleClick(item)}
      onContextMenu={onContextMenu}
      className={classes.cardButton}
    >
      <Paper
        shadow="xs"
        p="md"
        className={`${classes.card} ${selected ? classes.selected : ""}`}
      >
        <Stack align="center" gap="xs">
          {item.isDirectory ? (
            <IconFolder size={32} color="#fab005" />
          ) : (
            getFileIcon(item.name, 32) // Modified to accept size
          )}
          <Text size="sm" ta="center" lineClamp={2}>
            {item.name}
          </Text>
        </Stack>
      </Paper>
    </UnstyledButton>
  );
}
