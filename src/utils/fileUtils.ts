import prettyBytes from "pretty-bytes";
import { format, isToday, differenceInDays } from "date-fns";

export function formatFileSize(bytes: number): string {
  return prettyBytes(bytes);
}

export function formatDate(date: Date): string {
  const now = new Date();
  const daysDifference = differenceInDays(now, date);

  // Today: show time only
  if (isToday(date)) {
    return format(date, "HH:mm");
  }

  // Within last 7 days: show day of week
  if (daysDifference < 7) {
    return format(date, "EEE HH:mm");
  }

  // This year: show month and day
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, "MMM d");
  }

  // Different year: show full date
  return format(date, "MMM d, yyyy");
}
