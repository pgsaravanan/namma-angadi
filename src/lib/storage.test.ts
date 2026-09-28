import { rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";
import { deleteStoredImage, ImageUploadError, readStoredImage, saveProductImage } from "./storage";

const SHOP = "testshop123";

async function pngFile() {
  const bytes = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: "#8c2f39" } })
    .png()
    .toBuffer();
  return new File([new Uint8Array(bytes)], "photo.png", { type: "image/png" });
}

afterAll(() => rm(path.join(process.cwd(), "uploads", "shops", SHOP), { recursive: true, force: true }));

describe("product image storage", () => {
  it("stores a resized WebP that only the owning shop can read", async () => {
    const url = await saveProductImage(SHOP, await pngFile());
    expect(url).toMatch(new RegExp(`^/media/shops/${SHOP}/products/[A-Za-z0-9_-]+$`));

    const key = url.replace("/media/", "");
    const stored = await readStoredImage(SHOP, key);
    const metadata = await sharp(stored!).metadata();
    expect(metadata.format).toBe("webp");
    expect(Math.max(metadata.width!, metadata.height!)).toBe(1200);

    expect(await readStoredImage("othershop", key)).toBeNull();

    await deleteStoredImage(url);
    expect(await readStoredImage(SHOP, key)).toBeNull();
  });

  it("rejects files that are not real images", async () => {
    const fake = new File(["<script>alert(1)</script>"], "photo.png", { type: "image/png" });
    await expect(saveProductImage(SHOP, fake)).rejects.toBeInstanceOf(ImageUploadError);
  });

  it("refuses keys that try to leave the shop's folder", async () => {
    expect(await readStoredImage(SHOP, `shops/${SHOP}/products/../../../../.env`)).toBeNull();
    expect(await readStoredImage(SHOP, "../dev.db")).toBeNull();
  });
});
