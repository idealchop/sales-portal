import { randomUUID } from "crypto";
import { storage } from "../../config/firebase-admin";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function sanitizeFileName(name: string): string {
  const trimmed = name.trim().replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return trimmed || `poster-${Date.now()}.jpg`;
}

export async function uploadEventsTrainingImage(input: {
  uid: string;
  kind: "poster" | "thumbnail" | "blog-hero";
  fileName: string;
  contentType: string;
  buffer: Buffer;
}): Promise<string> {
  const contentType = ALLOWED_CONTENT_TYPES.has(input.contentType) ?
    input.contentType :
    "image/jpeg";

  if (input.buffer.length === 0) throw new Error("EMPTY_FILE");
  if (input.buffer.length > MAX_IMAGE_BYTES) throw new Error("FILE_TOO_LARGE");

  const bucket = storage.bucket();
  const safeName = sanitizeFileName(input.fileName);
  const objectPath = `events-training/${input.kind}/${input.uid}/${randomUUID()}-${safeName}`;
  const file = bucket.file(objectPath);
  const downloadToken = randomUUID();

  await file.save(input.buffer, {
    metadata: {
      contentType,
      cacheControl: "public, max-age=31536000",
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    },
  });

  const encodedPath = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;
}

/** Upload a generated digital certificate SVG and return a public download URL. */
export async function uploadCertificateSvg(input: {
  uid: string;
  certId: string;
  svg: string;
}): Promise<string> {
  const buffer = Buffer.from(input.svg, "utf8");
  if (buffer.length === 0) throw new Error("EMPTY_FILE");
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error("FILE_TOO_LARGE");

  const bucket = storage.bucket();
  const objectPath = `events-training/certificates/${input.uid}/${input.certId}.svg`;
  const file = bucket.file(objectPath);
  const downloadToken = randomUUID();

  await file.save(buffer, {
    metadata: {
      contentType: "image/svg+xml",
      cacheControl: "public, max-age=31536000",
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    },
  });

  const encodedPath = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;
}
