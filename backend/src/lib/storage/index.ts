// Storage abstraction. Today: Cloudinary (when configured). The provider-
// agnostic surface lets us add S3/R2 later without touching call sites.
//
//   isUploadConfigured()  → is file upload available right now?
//   uploadImage(dataUri)  → returns a hosted URL or throws

import { isCloudinaryConfigured, uploadDataUri } from "./cloudinary.js";

export type StorageProviderName = "cloudinary" | "none";

export function activeProvider(): StorageProviderName {
  if (isCloudinaryConfigured()) return "cloudinary";
  return "none";
}

export function isUploadConfigured(): boolean {
  return activeProvider() !== "none";
}

export class UploadError extends Error {}

/** Validate a base64 image data URI and upload it, returning the hosted URL. */
export async function uploadImage(dataUri: string): Promise<string> {
  if (typeof dataUri !== "string" || !/^data:image\/[a-zA-Z.+-]+;base64,/.test(dataUri)) {
    throw new UploadError("invalid_data_uri");
  }
  const provider = activeProvider();
  if (provider === "cloudinary") {
    const result = await uploadDataUri(dataUri);
    if (result.status === "success" && result.url) return result.url;
    throw new UploadError(result.errorMessage ?? "upload_failed");
  }
  throw new UploadError("not_configured");
}
