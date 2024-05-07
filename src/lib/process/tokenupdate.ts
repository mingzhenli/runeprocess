import { getRunesInfo } from "../api/unisat";
import DatabaseInstance from "../server/prisma.server";
import { sleep } from "../utils";

const TokenUpdateProcess = async () => {
  do {
    try {
      const runes = await DatabaseInstance.rune_token.findMany({
        select: {
          rune_id: true,
        },
      });

      for (const rune of runes) {
        try {
          const runeInfo = await getRunesInfo(rune.rune_id);

          if (runeInfo) {
            await DatabaseInstance.rune_token.update({
              where: { rune_id: rune.rune_id },
              data: {
                supply: runeInfo.supply || "0",
                holders: runeInfo.holders || 0,
              },
            });
          }

          await sleep(5000);
        } catch (e) {
          console.log("token update error:", e);
          continue;
        }
      }

      await sleep(1000 * 60);
    } catch (e) {
      console.error("token update process error:", e);
      await sleep(10000);
      continue;
    }
  } while (true);
};

TokenUpdateProcess();
