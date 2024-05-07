import dayjs from "dayjs";

import { checkInscriptionUTXO, checkUTXOBalance } from "../api/unisat";
import DatabaseInstance from "../server/prisma.server";
import RedisInstance from "../server/redis.server";
import { sleep } from "../utils";

const OfferCheckProcess = async () => {
  let start = 0;

  do {
    try {
      const offers = await DatabaseInstance.offers.findMany({
        select: {
          id: true,
          location_txid: true,
          location_vout: true,
          rune_id: true,
          amount: true,
          inscription_id: true,
          inscription_txid: true,
          inscription_vout: true,
        },
        where: {
          status: 1,
        },
        skip: start,
        take: 100,
      });

      if (offers.length === 0) {
        start = 0;
        await RedisInstance.set("offercheck_process_last_run", dayjs().unix());
        await sleep(1000 * 60 * 2);
        continue;
      }

      const chunks: {
        id: number;
        location_txid: string;
        location_vout: number;
        rune_id: string;
        amount: number;
      }[][] = [];

      for (let i = 0; i < offers.length; i += 3) {
        chunks.push(offers.slice(i, i + 3));
      }

      for (const chunk of chunks) {
        try {
          await sleep(1000);

          const results = await Promise.all(
            chunk.map((offer) =>
              checkUTXOBalance(offer.location_txid, offer.location_vout),
            ),
          );

          results.forEach((result, index) => {
            if (result.length !== 1) {
              DatabaseInstance.offers.update({
                where: { id: chunk[index].id },
                data: {
                  status: 2,
                },
              });
              return;
            }

            if (result[0].runeId !== chunk[index].rune_id) {
              DatabaseInstance.offers.update({
                where: { id: chunk[index].id },
                data: {
                  status: 2,
                },
              });
              return;
            }

            const amount = (
              BigInt(result[0].amount) /
              10n ** BigInt(result[0].divisibility)
            ).toString();

            if (amount !== chunk[index].amount.toString()) {
              DatabaseInstance.offers.update({
                where: { id: chunk[index].id },
                data: {
                  status: 2,
                },
              });
              return;
            }
          });
        } catch (e) {
          console.log(e);
          continue;
        }
      }

      for (const offer of offers) {
        if (!offer.inscription_id) continue;

        if (!offer.inscription_txid || !offer.inscription_vout) {
          DatabaseInstance.offers.update({
            where: { id: offer.id },
            data: {
              status: 2,
            },
          });
          continue;
        }

        const inscriptionUTXO = await checkInscriptionUTXO(
          offer.inscription_id,
        );

        if (!inscriptionUTXO) {
          DatabaseInstance.offers.update({
            where: { id: offer.id },
            data: {
              status: 2,
            },
          });
          continue;
        }

        if (
          inscriptionUTXO.txid !== offer.inscription_txid ||
          inscriptionUTXO.vout !== offer.inscription_vout
        ) {
          DatabaseInstance.offers.update({
            where: { id: offer.id },
            data: {
              status: 2,
            },
          });
          continue;
        }
      }

      start += offers.length;
    } catch (e) {
      console.error("offercheck process error:", e);
      await sleep(10000);
      continue;
    }
  } while (true);
};

OfferCheckProcess();
