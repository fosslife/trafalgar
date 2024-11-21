import { Paper, Text, Stack, UnstyledButton, TextInput } from "@mantine/core";
import { FileItem } from "@/lib/fileUtils";
import { getFileIcon } from "../../utils/getFileIcon";
import classes from "./FileCard.module.css";
import { IconFolder } from "@tabler/icons-react";

interface FileCardProps {
  item: FileItem;
  selected: boolean;
  editingItem: string | null;
  editValue: string;
  onSelect: (item: FileItem, event: React.MouseEvent) => void;
  onDoubleClick: (item: FileItem) => void;
  onContextMenu: (event: React.MouseEvent) => void;
  handleRenameSubmit: (item: FileItem, value: string) => void;
  setEditingItem: (item: string | null) => void;
  setEditValue: (value: string) => void;
}

export function FileCard({
  item,
  selected,
  editingItem,
  editValue,
  onSelect,
  onDoubleClick,
  onContextMenu,
  handleRenameSubmit,
  setEditingItem,
  setEditValue,
}: FileCardProps) {
  const isEditing = editingItem === item.name;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleRenameSubmit(item, e.currentTarget.value);
    } else if (e.key === "Escape") {
      setEditingItem(null);
      setEditValue(item.name);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    handleRenameSubmit(item, e.currentTarget.value);
  };

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
            getFileIcon(item.name, 32)
          )}
          {isEditing ? (
            <TextInput
              defaultValue={item.name}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              value={editValue}
              onChange={(e) => setEditValue(e.currentTarget.value)}
              autoFocus
              size="xs"
              styles={{ input: { textAlign: "center" } }}
            />
          ) : (
            <Text size="sm" ta="center" lineClamp={2}>
              {item.name}
            </Text>
          )}
        </Stack>
      </Paper>
    </UnstyledButton>
  );
}
