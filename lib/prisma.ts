import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/prisma/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Please configure it in your .env file."
    );
  }

  try {
    const adapter = new PrismaPg({ connectionString });
    const client = new PrismaClient({ adapter });
    console.log("✓ Prisma client initialized successfully");
    return client;
  } catch (error) {
    console.error("✗ Failed to initialize Prisma client:");
    if (error instanceof Error) {
      console.error(`  Error: ${error.message}`);
    }
    throw new Error(
      "Failed to initialize database connection. " +
        "Check your DATABASE_URL and ensure the database is accessible."
    );
  }
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;

export { prisma };