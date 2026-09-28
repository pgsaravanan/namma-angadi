import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/lib/db";
import { putStoredObject } from "../src/lib/storage";

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(full) : Promise.resolve([full]);
    }),
  );
  return nested.flat();
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to upload photos");
  }
  const root = path.join(process.cwd(), "uploads");
  const shopIds = new Set((await db.shop.findMany({ select: { id: true } })).map((shop) => shop.id));

  let uploaded = 0;
  for (const file of await walk(path.join(root, "shops"))) {
    const key = path.relative(root, file).split(path.sep).join("/");
    if (!shopIds.has(key.split("/")[1])) continue;
    await putStoredObject(key, await readFile(file));
    uploaded++;
  }
  console.log(`Uploaded ${uploaded} photos`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
