import axios from "axios";

import { RunesInfoListResponse } from "./type";

const UNISAT_API_KEY =
  "e9917a0a1c8d959edd453c76d743aa10adf64c87d1ea06790c7b9fe430de75f7";
const TESTNET = process.env.SUPPORT_TESTNET === "true";
const BASE_URL = TESTNET
  ? "https://open-api-testnet.unisat.io"
  : "https://open-api.unisat.io";

const AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 1000 * 20,
  headers: {
    Authorization: `Bearer ${UNISAT_API_KEY}`,
  },
});

export const getRunesInfoList = async (params: {
  start: number;
  limit: number;
}) => {
  const resp = await AxiosInstance.get<{
    code: number;
    msg: string;
    data: {
      detail: RunesInfoListResponse[];
      start: number;
      total: number;
    };
  }>("/v1/indexer/runes/info-list", {
    params,
  });

  return resp.data.data.detail;
};

export const getRunesInfo = async (runeid: string) => {
  const resp = await AxiosInstance.get<{
    code: number;
    msg: string;
    data: RunesInfoListResponse;
  }>(`/v1/indexer/runes/${runeid}/info`);
  return resp.data.data;
};

export const checkUTXOBalance = async (txid: string, index: number) => {
  const resp = await AxiosInstance.get<{
    code: number;
    message: string;
    data: {
      rune: string;
      runeid: string;
      amount: string;
      divisibility: number;
      symbol: string;
      spacedRune: string;
    }[];
  }>(`${BASE_URL}/v1/indexer/runes/utxo/${txid}/${index}/balance`);

  return resp.data.data.map((rune) => ({
    runeId: rune.runeid,
    rune: rune.rune,
    symbol: rune.symbol,
    spacedRune: rune.spacedRune,
    amount: rune.amount,
    divisibility: rune.divisibility,
  }));
};

export const checkInscriptionUTXO = async (inscriptionId: string) => {
  const resp = await AxiosInstance.get<{
    code: number;
    message: string;
    data: {
      utxo: {
        txid: string;
        vout: number;
      };
    };
  }>(`/v1/indexer/inscription/info/${inscriptionId}`);

  if (!resp.data.data) return;

  return resp.data.data.utxo;
};
