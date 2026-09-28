import { execSync } from "node:child_process";

const run = (command) => execSync(command, { stdio: "inherit" });

if (process.env.VERCEL_ENV === "production") {
  run("npx prisma migrate deploy");
} else {
  console.log(`Skipping database migrations for the ${process.env.VERCEL_ENV ?? "local"} build`);
}
run("npx next build");
