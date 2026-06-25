const HTML_ERROR_PATTERNS = [
  /<!doctype html/i,
  /<html[\s>]/i,
  /cloudflare/i,
  /error code 52[0-9]/i,
  /web server is down/i,
  /bad gateway/i,
  /gateway timeout/i,
];

const MAX_ERROR_LENGTH = 220;

export const SUPABASE_UNAVAILABLE_MESSAGE =
  "Allocation history is temporarily unavailable because Supabase is not reachable. If the project was paused for inactivity, resume it in Supabase, wait a minute, then refresh this page.";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unexpected server error.";
}

export function isSupabaseUnavailableError(message: string) {
  return HTML_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function formatSupabaseError(error: unknown, fallback: string) {
  const message = getErrorMessage(error).trim();

  if (!message) {
    return fallback;
  }

  if (isSupabaseUnavailableError(message)) {
    return SUPABASE_UNAVAILABLE_MESSAGE;
  }

  if (message.length > MAX_ERROR_LENGTH) {
    return `${fallback} ${message.slice(0, MAX_ERROR_LENGTH).trim()}...`;
  }

  return message;
}
