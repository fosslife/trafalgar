import { Group, Table, Text, TextInput } from "@mantine/core";
import { FileItem } from "@/lib/fileUtils";

import { IconFolder } from "@tabler/icons-react";

import classes from "../FileExplorer.module.css";
import { getFileIcon } from "../utils/getFileIcon";

interface ListViewProps {
  fileItems: FileItem[];
  editingItem: string | null;
  editValue: string;
  selectedItems: Set<string>;
  handleRowClick: (item: FileItem, event: React.MouseEvent) => void;
  handleDoubleClick: (item: FileItem) => void;
  handleRenameSubmit: (item: FileItem, value: string) => void;
  setEditingItem: (item: string | null) => void;
  setEditValue: (value: string) => void;
}

export function ListView({
  fileItems,
  selectedItems,
  editingItem,
  editValue,
  handleRowClick,
  handleDoubleClick,
  handleRenameSubmit,
  setEditingItem,
  setEditValue,
}: ListViewProps) {
  return (
    <Table.ScrollContainer
      minWidth={700}
      style={{ height: "calc(100% - 64px)", overflow: "auto" }}
    >
      <Table highlightOnHover highlightOnHoverColor="gray.1" stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: "40%" }}>Name</Table.Th>
            <Table.Th style={{ width: "13%" }}>Size</Table.Th>
            <Table.Th style={{ width: "17%" }}>Type</Table.Th>
            <Table.Th style={{ width: "30%" }}>Modified</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {fileItems.map((item) => (
            <Table.Tr
              key={item.name}
              className={selectedItems.has(item.name) ? classes.selected : ""}
              onClick={(e) => handleRowClick(item, e)}
              onDoubleClick={() => handleDoubleClick(item)}
            >
              <Table.Td>
                {editingItem === item.name ? (
                  <TextInput
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRenameSubmit(item, editValue);
                      } else if (e.key === "Escape") {
                        setEditingItem(null);
                      }
                    }}
                    onBlur={() => handleRenameSubmit(item, editValue)}
                    autoFocus
                    w="100%"
                    data-autofocus
                  />
                ) : (
                  <Group gap="sm" wrap="nowrap">
                    {item.isDirectory ? (
                      <IconFolder size={16} color="#fab005" />
                    ) : (
                      getFileIcon(item.name)
                    )}
                    <Text size="sm" truncate="end">
                      {item.name}
                    </Text>
                  </Group>
                )}
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {item.size}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {item.type}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {item.modified}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
