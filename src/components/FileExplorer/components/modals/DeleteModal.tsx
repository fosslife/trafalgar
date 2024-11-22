import { FileItem } from "@/lib/fileUtils";
import { Modal, Group, Text, Button, Stack, Box } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

interface DeleteModalProps {
  deleteModal: boolean;
  closeDeleteModal: () => void;
  filesToDelete: FileItem[];
  handleDelete: () => void;
}

export function DeleteModal({
  deleteModal,
  closeDeleteModal,
  filesToDelete,
  handleDelete,
}: DeleteModalProps) {
  return (
    <Modal
      opened={deleteModal}
      onClose={closeDeleteModal}
      title={
        <Group gap="xs">
          <IconAlertTriangle size={20} color="var(--mantine-color-red-6)" />
          <Text>Confirm Delete</Text>
        </Group>
      }
    >
      <Stack>
        <Text>
          Are you sure you want to delete {filesToDelete.length} item
          {filesToDelete.length !== 1 ? "s" : ""}? This action cannot be undone.
        </Text>

        {filesToDelete.length > 0 && (
          <Box size="sm" c="dimmed">
            Selected items:
            {filesToDelete.map((file) => (
              <Text key={file.name} size="sm" ml="md">
                • {file.name}
              </Text>
            ))}
          </Box>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDelete}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
