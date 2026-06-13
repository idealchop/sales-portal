export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

export function parseGoogleApiErrorBody(body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; code?: number; status?: string };
    };
    if (parsed.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // keep raw body
  }
  return body.slice(0, 500);
}
