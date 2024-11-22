import { Group, Table, Text, TextInput, UnstyledButton, Center } from "@mantine/core";
import { FileItem } from "@/lib/fileUtils";

import { IconFolder, IconChevronUp, IconChevronDown, IconSelector } from "@tabler/icons-react";

import classes from "../FileExplorer.module.css";
import { getFileIcon } from "../utils/getFileIcon";
import { SortDirection } from "..";
import { SortField } from "..";

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
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
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
  sortField,
  sortDirection,
  onSort,
}: ListViewProps) {
  const Th = ({ children, field }: { children: React.ReactNode; field: SortField }) => {
    const Icon = sortField === field ? (sortDirection === "asc" ? IconChevronUp : IconChevronDown) : IconSelector;

    return (
      <Table.Th>
        <UnstyledButton onClick={() => onSort(field)} style={{ width: "100%" }}>
          <Group justify="space-between">
            <span>{children}</span>
            <Center>
              <Icon size={14} />
            </Center>
          </Group>
        </UnstyledButton>
      </Table.Th>
    );
  };

  return (
    <div className={classes.tableContainer}>
      <Table highlightOnHover highlightOnHoverColor="gray.1" stickyHeader className={classes.table}>
        <Table.Thead>
          <Table.Tr>
            <Th field="name">Name</Th>
            <Th field="size">Size</Th>
            <Th field="type">Type</Th>
            <Th field="modified">Modified</Th>
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
                    {item.isDirectory ? <IconFolder size={16} color="#fab005" /> : getFileIcon(item.name)}
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
    </div>
  );
}
