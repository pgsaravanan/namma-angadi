import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { randomToken } from "./crypto";
import { isVideoType, MAX_VIDEO_BYTES, VIDEO_TYPES } from "./media";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
const MEDIA_PREFIX = "/media/";
const KEY_PATTERN = /^shops\/[a-z0-9]+\/(products|categories|branding|icons|promotions|stories)\/[A-Za-z0-9_-]+(\.(mp4|webm))?$/;

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export type ImageKind = "products" | "categories" | "branding" | "icons" | "promotions" | "stories";

export type VideoKind = Extract<ImageKind, "promotions" | "stories">;

const MAX_EDGE: Record<ImageKind, number> = {
  products: 1200,
  categories: 1200,
  branding: 2000,
  icons: 512,
  promotions: 1400,
  stories: 1200,
};

const TRIM_BORDERS = new Set<ImageKind>(["promotions", "stories"]);

export function contentTypeForKey(key: string) {
  if (key.endsWith(".mp4")) return "video/mp4";
  if (key.endsWith(".webm")) return "video/webm";
  return "image/webp";
}

export class ImageUploadError extends Error {}

type Store = {
  write(key: string, bytes: Buffer): Promise<void>;
  signUpload?(key: string): Promise<string>;
  signRead?(key: string, seconds: number): Promise<string | null>;
  read(key: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
};

const localStore: Store = {
  async write(key, bytes) {
    const filePath = path.join(UPLOAD_ROOT, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes);
  },
  async read(key) {
    try {
      return await readFile(path.join(UPLOAD_ROOT, key));
    } catch {
      return null;
    }
  },
  async remove(key) {
    await rm(path.join(UPLOAD_ROOT, key), { force: true });
  },
};

function supabaseStore(url: string, serviceKey: string, bucket: string): Store {
  const objectUrl = (key: string) => `${url}/storage/v1/object/${bucket}/${key}`;
  const auth = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey };
  return {
    async write(key, bytes) {
      const response = await fetch(objectUrl(key), {
        method: "POST",
        headers: { ...auth, "Content-Type": contentTypeForKey(key), "x-upsert": "true", "cache-control": "31536000" },
        body: new Uint8Array(bytes),
      });
      if (!response.ok) {
        console.error("Photo upload failed", response.status, await response.text());
        throw new ImageUploadError("The photo couldn't be uploaded. Please try again in a moment.");
      }
    },
    async signUpload(key) {
      const response = await fetch(`${url}/storage/v1/object/upload/sign/${bucket}/${key}`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: "{}",
      });
      const body = (await response.json().catch(() => null)) as { url?: string } | null;
      if (!response.ok || !body?.url) {
        console.error("Signed upload failed", response.status, body);
        throw new ImageUploadError("The video couldn't be uploaded. Please try again in a moment.");
      }
      return `${url}/storage/v1${body.url}`;
    },
    async signRead(key, seconds) {
      const response = await fetch(`${url}/storage/v1/object/sign/${bucket}/${key}`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: seconds }),
      });
      const body = (await response.json().catch(() => null)) as { signedURL?: string } | null;
      return response.ok && body?.signedURL ? `${url}/storage/v1${body.signedURL}` : null;
    },
    async read(key) {
      const response = await fetch(objectUrl(key), { headers: auth, cache: "no-store" });
      return response.ok ? Buffer.from(await response.arrayBuffer()) : null;
    },
    async remove(key) {
      await fetch(`${url}/storage/v1/object/${bucket}`, {
        method: "DELETE",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [key] }),
      });
    },
  };
}

function store(): Store {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? supabaseStore(url.replace(/\/$/, ""), key, process.env.SUPABASE_STORAGE_BUCKET || "media") : localStore;
}

export async function putStoredObject(key: string, bytes: Buffer) {
  if (!KEY_PATTERN.test(key)) throw new Error(`Invalid storage key ${key}`);
  await store().write(key, bytes);
}

function isSupportedImage(bytes: Buffer) {
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  const isGif = bytes.subarray(0, 4).toString("ascii") === "GIF8";
  return isJpeg || isPng || isWebp || isGif;
}

export async function saveImage(shopId: string, file: File, kind: ImageKind) {
  if (file.size > MAX_IMAGE_BYTES) throw new ImageUploadError("Photos must be 4 MB or smaller");

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isSupportedImage(bytes)) throw new ImageUploadError("Upload a JPG, PNG, WebP or GIF image");

  let output: Buffer;
  try {
    const animated = ((await sharp(bytes).metadata()).pages ?? 1) > 1;
    const input = !animated && TRIM_BORDERS.has(kind) ? await sharp(bytes).rotate().trim({ threshold: 18 }).toBuffer() : bytes;
    output = await sharp(input, { animated: true })
      .rotate()
      .resize(MAX_EDGE[kind], MAX_EDGE[kind], { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new ImageUploadError("That photo could not be read. Try a different file.");
  }

  const key = `shops/${shopId}/${kind}/${randomToken(12)}`;
  await store().write(key, output);
  return `${MEDIA_PREFIX}${key}`;
}

function keyFromUrl(url: string) {
  if (!url.startsWith(MEDIA_PREFIX)) return null;
  const key = url.slice(MEDIA_PREFIX.length);
  return KEY_PATTERN.test(key) ? key : null;
}

export async function deleteStoredImage(url: string | null) {
  const key = url && keyFromUrl(url);
  if (key) await store().remove(key);
}

function isShopKey(shopId: string, key: string) {
  return KEY_PATTERN.test(key) && key.startsWith(`shops/${shopId}/`);
}

export async function signedMediaUrl(shopId: string, key: string, seconds: number) {
  const target = store();
  return isShopKey(shopId, key) && target.signRead ? target.signRead(key, seconds) : null;
}

export async function readStoredImage(shopId: string, key: string) {
  if (!KEY_PATTERN.test(key) || !key.startsWith(`shops/${shopId}/`)) return null;
  return store().read(key);
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

function videoKey(shopId: string, kind: VideoKind, contentType: string) {
  if (!isVideoType(contentType)) throw new ImageUploadError("Upload an MP4 or WebM video");
  return `shops/${shopId}/${kind}/${randomToken(12)}.${VIDEO_TYPES[contentType]}`;
}

export async function prepareVideoUpload(shopId: string, kind: VideoKind, contentType: string, size: number) {
  if (size > MAX_VIDEO_BYTES) throw new ImageUploadError("Videos must be 30 MB or smaller");
  const key = videoKey(shopId, kind, contentType);
  const target = store();
  return { mediaUrl: `${MEDIA_PREFIX}${key}`, uploadUrl: target.signUpload ? await target.signUpload(key) : null };
}

export async function saveVideoDirectly(shopId: string, kind: VideoKind, file: File) {
  if (file.size > MAX_VIDEO_BYTES) throw new ImageUploadError("Videos must be 30 MB or smaller");
  const key = videoKey(shopId, kind, file.type);
  await store().write(key, Buffer.from(await file.arrayBuffer()));
  return `${MEDIA_PREFIX}${key}`;
}

type MediaFieldOptions = { current: string | null; field: string; kind: VideoKind };

export async function resolveMediaField(shopId: string, formData: FormData, options: MediaFieldOptions) {
  const video = String(formData.get(`${options.field}Video`) ?? "");
  if (video) {
    const key = keyFromUrl(video);
    if (!key || !key.startsWith(`shops/${shopId}/${options.kind}/`) || !/\.(mp4|webm)$/.test(key)) {
      throw new ImageUploadError("That video upload didn't work. Please choose it again.");
    }
    return video;
  }
  return resolveImageField(shopId, formData, { current: options.current, field: options.field, kind: options.kind });
}
