import {
  IconFile,
  IconFileText,
  IconFileCode,
  IconFileZip,
  IconFileMusic,
  IconVideo,
  IconLayoutCollage,
} from "@tabler/icons-react";

export function getFileIcon(fileName: string, size: number = 16) {
  const ext = fileName.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "txt":
    case "md":
      return <IconFileText size={size} color="#868e96" />;
    case "js":
    case "ts":
    case "jsx":
    case "tsx":
    case "py":
    case "rs":
      return <IconFileCode size={size} color="#228be6" />;
    case "zip":
    case "rar":
    case "7z":
      return <IconFileZip size={size} color="#fab005" />;
    case "mp3":
    case "wav":
    case "ogg":
      return <IconFileMusic size={size} color="#e64980" />;
    case "mp4":
    case "mkv":
    case "avi":
      return <IconVideo size={size} color="#7048e8" />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      return <IconLayoutCollage size={size} color="#40c057" />;
    default:
      return <IconFile size={size} color="#868e96" />;
  }
}
