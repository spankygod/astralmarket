import { PrismaClient } from "@prisma/client";

import { syncBagsTokenSocials } from "../lib/bags-socials";

const prisma = new PrismaClient();

const main = async () => {
  try {
    const result = await syncBagsTokenSocials(prisma);

    console.log(
      JSON.stringify(
        {
          success: true,
          response: result,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

void main();
