import { randomUUID } from "crypto";
import { storage } from "../config/firebase-admin";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export function sanitizeAvatarFileName(name: string): string {
  const trimmed = name.trim().replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return trimmed || `avatar-${Date.now()}.jpg`;
}

export async function uploadUserAvatar(input: {
  uid: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}): Promise<string> {
  const { uid, buffer } = input;
  const contentType = ALLOWED_CONTENT_TYPES.has(input.contentType) ?
    input.contentType :
    "image/jpeg";

  if (buffer.length === 0) {
    throw new Error("EMPTY_FILE");
  }
  if (buffer.length > MAX_AVATAR_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const bucket = storage.bucket();
  const safeName = sanitizeAvatarFileName(input.fileName);
  const objectPath = `user-avatars/${uid}/${safeName}`;
  const file = bucket.file(objectPath);
  const downloadToken = randomUUID();

  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: "public, max-age=31536000",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  const encodedPath = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;
}
