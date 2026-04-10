import { getAuth } from "firebase/auth";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

import type { MediaAssetDTO } from "../types/media";
import { registerRemoteMedia } from "./mediaRegisterApi";
import { getFirebaseApp } from "./firebase";

const devAuth = import.meta.env.VITE_DEV_AUTH === "true";

function extensionFromName(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function guessContentType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type.split(";")[0]!.trim().toLowerCase();
  }
  const ext = extensionFromName(file.name);
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    webm: "video/webm",
  };
  return map[ext] ?? "application/octet-stream";
}

/**
 * Use Firebase Storage when bucket is configured, Storage is not disabled, and the user
 * signed in with Firebase (not dev bypass token). Otherwise the app uses POST /media/upload.
 */
export function canUseFirebaseStorage(): boolean {
  if (import.meta.env.VITE_USE_FIREBASE_STORAGE === "false") return false;
  if (devAuth) return false;
  const bucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  if (!bucket) return false;
  const app = getFirebaseApp();
  if (!app) return false;
  const user = getAuth(app).currentUser;
  return Boolean(user);
}

export async function uploadMediaViaFirebaseAndRegister(file: File): Promise<MediaAssetDTO> {
  const app = getFirebaseApp();
  if (!app) throw new Error("Firebase is not configured");

  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in with Firebase to upload to cloud storage");

  const contentType = guessContentType(file);
  if (contentType === "application/octet-stream") {
    throw new Error("Could not detect file type; use a supported image or video format");
  }

  const storage = getStorage(app);
  const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(0, 120) || "file";
  const objectPath = `coaches/${user.uid}/media/${crypto.randomUUID()}_${safeName}`;
  const storageRef = ref(storage, objectPath);

  await uploadBytes(storageRef, file, { contentType });
  const publicUrl = await getDownloadURL(storageRef);

  return registerRemoteMedia({
    storage_provider: "firebase",
    public_url: publicUrl,
    content_type: contentType,
    byte_size: file.size,
    original_filename: file.name || null,
  });
}
