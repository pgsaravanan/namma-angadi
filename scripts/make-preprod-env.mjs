import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const TARGET = ".env.preprod";
if (existsSync(TARGET)) {
  console.log(`${TARGET} already exists. Delete it first if you want a fresh one.`);
  process.exit(0);
}

const local = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2]]),
);

const toAppSchema = (value) => {
  const url = new URL(value);
  url.searchParams.set("schema", "app");
  return url.toString();
};

const lines = [
  "# Paste everything below into Vercel → Project → Environment Variables (it accepts a pasted .env).",
  "# Keep this file private. It is ignored by git.",
  `DATABASE_URL="${toAppSchema(local.DATABASE_URL)}"`,
  `DIRECT_URL="${toAppSchema(local.DIRECT_URL)}"`,
  `ENCRYPTION_KEY="${randomBytes(32).toString("base64")}"`,
  'ROOT_DOMAIN="namma-angadi.vercel.app"',
  'SITE_MODE="preprod"',
  'ENABLE_TEST_PAYMENTS="true"',
  'TRUST_PROXY_HEADERS="true"',
  `SUPABASE_URL="https://${new URL(local.DATABASE_URL).username.split(".")[1]}.supabase.co"`,
  'SUPABASE_SERVICE_ROLE_KEY="PASTE-THE-SERVICE-ROLE-KEY-HERE"',
  'SUPABASE_STORAGE_BUCKET="media"',
  "",
];
writeFileSync(TARGET, lines.join("\n"), { mode: 0o600 });
console.log(`Created ${TARGET}. Add the Supabase service_role key, then paste the file into Vercel.`);
