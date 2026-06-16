export function normalizeDriveLink(link: string): string {
  if (!link) return "";
  
  // Try pattern 1: /d/{fileId}/
  const dMatch = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) {
    return `https://drive.google.com/file/d/${dMatch[1]}/preview`;
  }
  
  // Try pattern 2: ?id={fileId}
  const idMatch = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
  }
  
  return link;
}

export function detectResourceType(link: string): "pdf" | "ppt" | "doc" | "link" | "video" {
  if (!link) return "pdf";
  
  if (link.includes("docs.google.com/presentation")) {
    return "ppt";
  }
  if (link.includes("docs.google.com/document")) {
    return "doc";
  }
  if (link.includes("drive.google.com/file")) {
    return "pdf";
  }
  if (link.includes("youtube.com") || link.includes("youtu.be") || link.match(/\.(mp4|mkv|webm|avi)$/i)) {
    return "video";
  }
  
  return "link";
}
