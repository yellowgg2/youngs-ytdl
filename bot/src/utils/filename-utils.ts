const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

export function sanitizePathSegment(value: string, fallback: string): string {
  const sanitized = value
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[/\\]+/g, " - ")
    .replace(/[:|]+/g, " - ")
    .replace(/\"/g, "'")
    .replace(/[?*<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/[. ]+$/, "")
    .trim();

  if (!sanitized || /^[.\-\s]+$/.test(sanitized)) {
    return fallback;
  }

  return WINDOWS_RESERVED_NAME.test(sanitized) ? `${sanitized}_` : sanitized;
}
