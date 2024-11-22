import { Image, Text, Stack, Box } from "@mantine/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useEffect, useState } from "react";

interface FilePreviewProps {
  fileType: "image" | "video" | "audio" | "pdf" | "code" | null;
  filePath: string | null;
}

export function FilePreview({ filePath, fileType }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (filePath) {
      if (fileType === "image") {
        try {
          const url = convertFileSrc(filePath);
          setPreviewUrl(url);
          setError(null);
        } catch {
          setError("Failed to load preview");
          setPreviewUrl(null);
        }
      } else if (fileType === "code") {
        readTextFile(filePath).then((content) => {
          console.log(content);
          setPreviewText(content.slice(0, 100));
        });
      }
    }
  }, [filePath, fileType]);

  return (
    <Box title="File Preview">
      {error ? (
        <Text c="red">{error}</Text>
      ) : (
        <Stack>
          {previewUrl && (
            <Image src={previewUrl} alt="Preview" fit="contain" fallbackSrc="path/to/fallback-image.png" />
          )}
          {previewText && <Text>{previewText}</Text>}
        </Stack>
      )}
    </Box>
  );
}
