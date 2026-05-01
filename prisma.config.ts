import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { defineConfig } from "prisma/config";

function cleanUrl(url: string | undefined): string {
  if (!url) return "";
  const stripped = url.replace(/\\n/g, "").replace(/\n/g, "").trim();
  if (!stripped) return "";
  try {
    const u = new URL(stripped);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return stripped;
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: [
      process.env["POSTGRES_PRISMA_URL"],
      process.env["NEON_DATABASE_URL"],
      process.env["POSTGRES_URL"],
      process.env["DATABASE_URL"],
    ]
      .map(cleanUrl)
      .find((u) => !!u),
  },
});
