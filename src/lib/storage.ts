import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { randomToken } from "./crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
const MEDIA_PREFIX = "/media/";
const KEY_PATTERN = /^shops\/[a-z0-9]+\/(products|categories|branding)\/[A-Za-z0-9_-]+$/;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageKind = "products" | "categories" | "branding";

const MAX_EDGE: Record<ImageKind, number> = { products: 1200, categories: 1200, branding: 2000 };

export class ImageUploadError extends Error {}

function isSupportedImage(bytes: Buffer) {
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return isJpeg || isPng || isWebp;
}

export async function saveImage(shopId: string, file: File, kind: ImageKind) {
  if (file.size > MAX_IMAGE_BYTES) throw new ImageUploadError("Photos must be 5 MB or smaller");

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isSupportedImage(bytes)) throw new ImageUploadError("Upload a JPG, PNG or WebP photo");

  let output: Buffer;
  try {
    output = await sharp(bytes)
      .rotate()
      .resize(MAX_EDGE[kind], MAX_EDGE[kind], { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new ImageUploadError("That photo could not be read. Try a different file.");
  }

  const key = `shops/${shopId}/${kind}/${randomToken(12)}`;
  const filePath = path.join(UPLOAD_ROOT, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, output);
  return `${MEDIA_PREFIX}${key}`;
}

function keyFromUrl(url: string) {
  if (!url.startsWith(MEDIA_PREFIX)) return null;
  const key = url.slice(MEDIA_PREFIX.length);
  return KEY_PATTERN.test(key) ? key : null;
}

export async function deleteStoredImage(url: string | null) {
  const key = url && keyFromUrl(url);
  if (key) await rm(path.join(UPLOAD_ROOT, key), { force: true });
}

export async function readStoredImage(shopId: string, key: string) {
  if (!KEY_PATTERN.test(key) || !key.startsWith(`shops/${shopId}/`)) return null;
  try {
    return await readFile(path.join(UPLOAD_ROOT, key));
  } catch {
    return null;
  }
}

export function saveProductImage(shopId: string, file: File) {
  return saveImage(shopId, file, "products");
}

type ImageFieldOptions = { current: string | null; field: string; kind: ImageKind; allowLink?: boolean };

export async function resolveImageField(shopId: string, formData: FormData, options: ImageFieldOptions) {
  const file = formData.get(options.field);
  if (file instanceof File && file.size > 0) return saveImage(shopId, file, options.kind);

  const link = options.allowLink ? String(formData.get(`${options.field}Link`) ?? "").trim() : "";
  if (link) {
    if (!/^https:\/\/[^\s]+$/.test(link) || link.length > 2000) {
      throw new ImageUploadError("Image link must start with https://");
    }
    return link;
  }

  if (formData.get(`${options.field}Remove`) === "on") return null;
  return options.current;
}
