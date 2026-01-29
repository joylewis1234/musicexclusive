import { safeStringify } from "@/utils/safeStringify";

export type StorageXhrUploadResult = {
  ok: boolean;
  status: number;
  responseText: string;
};

function encodeStoragePath(path: string) {
  // Keep slashes, encode path segments.
  return path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

type UploadWithXhrParams = {
  url: string;
  apikey: string;
  accessToken: string;
  bucket: string;
  objectPath: string;
  file: File;
  contentType: string;
  upsert?: boolean;
  cacheControl?: string;
  onProgress?: (pct: number) => void;
};

/**
 * XHR-based upload to improve mobile reliability vs fetch.
 * Sends multipart/form-data to the Storage object endpoint.
 */
export async function uploadToStorageWithXhr(params: UploadWithXhrParams): Promise<StorageXhrUploadResult> {
  const {
    url,
    apikey,
    accessToken,
    bucket,
    objectPath,
    file,
    contentType,
    upsert = true,
    cacheControl = "3600",
    onProgress,
  } = params;

  const safeObjectPath = objectPath.replace(/^\/+/, "");
  const endpoint = `${url.replace(/\/+$/, "")}/storage/v1/object/${bucket}/${encodeStoragePath(safeObjectPath)}`;

  // IMPORTANT: do not set Content-Type header (browser needs boundary)
  const form = new FormData();
  form.append("cacheControl", cacheControl);

  // Force an explicit per-part content type
  const blob = file.slice(0, file.size, contentType);
  const typedFile = new File([blob], "file", { type: contentType });
  form.append("", typedFile);

  return await new Promise<StorageXhrUploadResult>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.responseType = "text";

    xhr.setRequestHeader("apikey", apikey);
    xhr.setRequestHeader("authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("x-upsert", upsert ? "true" : "false");

    xhr.upload.onprogress = (evt) => {
      try {
        if (!evt.lengthComputable) return;
        const pct = Math.max(0, Math.min(100, (evt.loaded / evt.total) * 100));
        onProgress?.(pct);
      } catch {
        // ignore
      }
    };

    xhr.onerror = () => {
      resolve({ ok: false, status: xhr.status || 0, responseText: xhr.responseText || "XHR network error" });
    };

    xhr.onabort = () => {
      resolve({ ok: false, status: xhr.status || 0, responseText: xhr.responseText || "XHR aborted" });
    };

    xhr.onload = () => {
      const status = xhr.status || 0;
      const ok = status >= 200 && status < 300;
      resolve({ ok, status, responseText: xhr.responseText || "" });
    };

    try {
      xhr.send(form);
    } catch (err) {
      resolve({ ok: false, status: 0, responseText: safeStringify(err) });
    }
  });
}
