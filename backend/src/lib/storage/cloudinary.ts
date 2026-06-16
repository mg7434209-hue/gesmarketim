// Cloudinary signed upload (no SDK — REST + node crypto).
//
// Accepts a base64 data URI (data:image/...;base64,XXXX) and uploads it via
// Cloudinary's signed upload endpoint, returning the hosted secure URL.
// Signature: SHA1 of the alphabetically-sorted signable params + api_secret.
//
// Only invoked when CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET are present.

import crypto from "node:crypto";

function creds() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY?.trim() ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET?.trim() ?? "",
    folder: process.env.CLOUDINARY_FOLDER?.trim() || "gesmarketim",
  };
}

export function isCloudinaryConfigured(): boolean {
  const c = creds();
  return Boolean(c.cloudName && c.apiKey && c.apiSecret);
}

export interface UploadResult {
  status: "success" | "failure";
  url?: string;
  errorMessage?: string;
}

export async function uploadDataUri(dataUri: string): Promise<UploadResult> {
  const { cloudName, apiKey, apiSecret, folder } = creds();
  const timestamp = Math.floor(Date.now() / 1000);

  // Params to sign (alphabetical), excluding file/api_key/signature.
  const signable: Record<string, string> = {
    folder,
    timestamp: String(timestamp),
  };
  const toSign = Object.keys(signable)
    .sort()
    .map((k) => `${k}=${signable[k]}`)
    .join("&");
  const signature = crypto
    .createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");

  const formData = new FormData();
  formData.append("file", dataUri);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("signature", signature);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: formData },
    );
    const json = (await res.json()) as {
      secure_url?: string;
      error?: { message?: string };
    };
    if (res.ok && json.secure_url) {
      return { status: "success", url: json.secure_url };
    }
    return {
      status: "failure",
      errorMessage: json.error?.message ?? `upload_failed_${res.status}`,
    };
  } catch (err) {
    return {
      status: "failure",
      errorMessage: err instanceof Error ? err.message : "upload_error",
    };
  }
}
