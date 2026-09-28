import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";

let muted = false;
const output = new Writable({
  write(chunk, _encoding, done) {
    if (!muted) process.stdout.write(chunk);
    done();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: true });
const ask = (question, hidden = false) =>
  new Promise((resolve) => {
    process.stdout.write(question);
    muted = hidden;
    rl.question("", (answer) => {
      muted = false;
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });

console.log("\nIn Supabase: open your project → Connect → ORMs or Connection string.");
console.log('Copy the "Transaction pooler" string (port 6543). It contains [YOUR-PASSWORD]; that is fine.\n');

const pooler = (await ask("Transaction pooler connection string: "))
  .replace(/^DATABASE_URL\s*=\s*/, "")
  .replace(/^["']|["']$/g, "");
const password = await ask("Database password (hidden): ", true);
rl.close();

let url;
try {
  url = new URL(pooler.replace("[YOUR-PASSWORD]", encodeURIComponent(password)));
} catch {
  console.error("That doesn't look like a connection string. Nothing was changed.");
  process.exit(1);
}
if (!url.hostname.endsWith("pooler.supabase.com")) {
  console.error("Expected a *.pooler.supabase.com address. Nothing was changed.");
  process.exit(1);
}

const withSchema = (port, schema) => {
  const copy = new URL(url);
  copy.port = String(port);
  copy.search = "";
  copy.searchParams.set("schema", schema);
  return copy.toString();
};

const values = {
  DATABASE_URL: withSchema(6543, "dev"),
  DIRECT_URL: withSchema(5432, "dev"),
  SHADOW_DATABASE_URL: (() => {
    const copy = new URL(url);
    copy.port = "5432";
    copy.pathname = "/prisma_shadow";
    copy.search = "";
    copy.searchParams.set("schema", "dev");
    return copy.toString();
  })(),
};

let env = readFileSync(".env", "utf8");
for (const [key, value] of Object.entries(values)) {
  const line = `${key}="${value}"`;
  env = new RegExp(`^${key}=.*$`, "m").test(env) ? env.replace(new RegExp(`^${key}=.*$`, "m"), line) : `${line}\n${env}`;
}
writeFileSync(".env", env);
console.log("\nSaved DATABASE_URL, DIRECT_URL and SHADOW_DATABASE_URL to .env (schema: dev).");
console.log("Next: tell Claude it's done.\n");
