import { PrismaClient } from "@prisma/client";

import { withBagsApiBudget } from "../lib/bags-client";
import { syncBagsMarket } from "../lib/bags-sync";

const prisma = new PrismaClient();

const main = async () => {
  try {
    const result = await withBagsApiBudget("background", () =>
      syncBagsMarket(prisma),
    );

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
