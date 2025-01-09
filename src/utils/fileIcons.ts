import {
  File,
  FilePdf,
  FileDoc,
  FileTxt,
  FileMd,
  MicrosoftExcelLogo,
  FilePpt,
  FileJpg,
  FilePng,
  Gif,
  FileSvg,
  FileAudio,
  FileVideo,
  FileJs,
  FileTs,
  FilePy,
  FileCpp,
  CodeBlock,
  FileArchive,
  FileX,
} from "@phosphor-icons/react";

const fileIconMap: Record<string, React.ElementType> = {
  // Documents
  pdf: FilePdf,
  doc: FileDoc,
  docx: FileDoc,
  txt: FileTxt,
  md: FileMd,
  xls: MicrosoftExcelLogo,
  xlsx: MicrosoftExcelLogo,
  ppt: FilePpt,
  pptx: FilePpt,

  // Images
  jpg: FileJpg,
  jpeg: FileJpg,
  png: FilePng,
  gif: Gif,
  svg: FileSvg,
  webp: FileJpg,

  // Audio
  mp3: FileAudio,
  wav: FileAudio,
  ogg: FileAudio,

  // Video
  mp4: FileVideo,
  mkv: FileVideo,
  avi: FileVideo,

  // Development
  js: FileJs,
  jsx: FileJs,
  ts: FileTs,
  tsx: FileTs,
  py: FilePy,
  cpp: FileCpp,
  c: FileCpp,
  h: FileCpp,
  hpp: FileCpp,

  // Archives
  zip: FileArchive,
  rar: FileArchive,
  "7z": FileArchive,
  tar: FileArchive,
  gz: FileArchive,

  // Executables
  exe: FileX,
  msi: FileX,
};

export function getFileIcon(filename: string): React.ElementType {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (!extension) return File;

  return fileIconMap[extension] || CodeBlock;
}
