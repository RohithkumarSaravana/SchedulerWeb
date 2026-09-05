import path from "node:path";
import { defineConfig } from "prisma/config";

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

// Only the Prisma CLI (generate/db push/studio/seed) reads this file - the app's own
// PrismaClient instantiates its own driver adapter in src/lib/prisma.ts.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: DATABASE_URL,
  },
});
