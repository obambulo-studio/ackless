export function parseHttpUrl(url: string): URL | null {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
      ? parsedUrl
      : null;
  } catch {
    return null;
  }
}
