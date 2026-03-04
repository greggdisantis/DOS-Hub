import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:3000";

/**
 * Upload a local file (image or PDF) to the material delivery S3 bucket.
 * Returns the public URL of the uploaded file.
 */
export async function uploadMaterialFile(
  uri: string,
  mimeType: string,
  fileName: string,
): Promise<string> {
  let base64: string;

  if (Platform.OS === "web") {
    // On web, fetch the blob and convert to base64
    const response = await fetch(uri);
    const blob = await response.blob();
    base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]); // strip data:...;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    // On native, use expo-file-system
    base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  const response = await fetch(`${API_BASE}/api/upload-material-file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, mimeType, fileName }),
    credentials: "include",
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error ?? `Upload failed: ${response.status}`);
  }

  const { url } = await response.json();
  return url as string;
}
