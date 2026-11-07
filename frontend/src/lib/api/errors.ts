import axios from "axios";

export async function extractErrorMessage(error: unknown): Promise<string> {
  if (!axios.isAxiosError(error)) {
    return "Something went wrong.";
  }

  const data = error.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) return parsed.error;
    } catch {
      // body wasn't JSON, fall through to the generic message below
    }
  }

  return error.message;
}
