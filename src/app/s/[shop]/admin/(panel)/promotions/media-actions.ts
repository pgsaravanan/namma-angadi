"use server";

import { requireShopPermission } from "@/lib/auth";
import { ImageUploadError, prepareVideoUpload, saveVideoDirectly, type VideoKind } from "@/lib/storage";

const KINDS: VideoKind[] = ["promotions", "stories"];

type UploadTarget = { mediaUrl: string; uploadUrl: string | null } | { error: string };

export async function startVideoUpload(kind: VideoKind, contentType: string, size: number): Promise<UploadTarget> {
  const { shop } = await requireShopPermission("marketing:manage");
  if (!KINDS.includes(kind)) return { error: "Unknown upload" };
  try {
    return await prepareVideoUpload(shop.id, kind, contentType, size);
  } catch (error) {
    if (error instanceof ImageUploadError) return { error: error.message };
    throw error;
  }
}

export async function uploadVideoToServer(kind: VideoKind, formData: FormData): Promise<UploadTarget> {
  const { shop } = await requireShopPermission("marketing:manage");
  const file = formData.get("video");
  if (!KINDS.includes(kind) || !(file instanceof File)) return { error: "Choose a video to upload" };
  try {
    return { mediaUrl: await saveVideoDirectly(shop.id, kind, file), uploadUrl: null };
  } catch (error) {
    if (error instanceof ImageUploadError) return { error: error.message };
    throw error;
  }
}
