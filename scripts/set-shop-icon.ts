import "dotenv/config";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { randomToken } from "../src/lib/crypto";
import { db } from "../src/lib/db";
import { putStoredObject } from "../src/lib/storage";

async function main() {
  const [slug, file] = process.argv.slice(2);
  if (!slug || !file) throw new Error("Usage: set-shop-icon <shop-slug> <image-file>");
  const shop = await db.shop.findUniqueOrThrow({ where: { slug } });
  const bytes = await sharp(await readFile(file)).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp().toBuffer();
  const key = `shops/${shop.id}/icons/${randomToken(12)}`;
  await putStoredObject(key, bytes);
  await db.shop.update({ where: { id: shop.id }, data: { iconUrl: `/media/${key}` } });
  console.log(`Icon set for ${shop.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
