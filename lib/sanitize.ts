const HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/gi;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/g;

export function stripHtmlTags(value: string): string {
  return value.replace(HTML_TAG_PATTERN, "");
}

export function sanitizeDisplayText(value: string, maxLength = 200): string {
  const stripped = stripHtmlTags(value).replace(CONTROL_CHAR_PATTERN, "").trim();
  if (stripped.length <= maxLength) {
    return stripped;
  }

  return `${stripped.slice(0, maxLength).trim()}...`;
}
