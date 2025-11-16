"use server";

import {
    createPublicClient,
    createWalletClient,
    http,
    type PublicArkivClient,
    type WalletArkivClient
} from "@arkiv-network/sdk";
import { mendoza } from "@arkiv-network/sdk/chains";
import { privateKeyToAccount } from "viem/accounts";

const DEFAULT_RPC_URL = "https://mendoza.hoodi.arkiv.network/rpc";
const DEFAULT_WS_URL = "wss://mendoza.hoodi.arkiv.network/rpc/ws";
const ARKIV_LONG_EXPIRATION_SECONDS = 60 * 60 * 24 * 365 * 5; // 5 years

let walletClientPromise: Promise<WalletArkivClient> | null = null;
let publicClientPromise: Promise<PublicArkivClient> | null = null;

const getRpcUrl = () => process.env.ARKIV_RPC_URL || DEFAULT_RPC_URL;

const getWsUrl = () => process.env.ARKIV_WS_URL || DEFAULT_WS_URL;

let cachedAccount: ReturnType<typeof privateKeyToAccount> | null = null;

const getAccount = () => {
    if (!cachedAccount) {
        const privateKey = process.env.ARKIV_PRIVATE_KEY;

        if (!privateKey) {
            throw new Error("ARKIV_PRIVATE_KEY is not configured");
        }

        const normalized = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;

        cachedAccount = privateKeyToAccount(normalized as `0x${string}`);
    }

    return cachedAccount;
};

export const getArkivOwnerAddress = async () => getAccount().address;

export const getArkivWalletClient = async (): Promise<WalletArkivClient> => {
    if (!walletClientPromise) {
        walletClientPromise = (async () =>
            createWalletClient({
                chain: mendoza,
                transport: http(getRpcUrl()),
                account: getAccount()
            }))();
    }

    return walletClientPromise;
};

export const getArkivPublicClient = async (): Promise<PublicArkivClient> => {
    if (!publicClientPromise) {
        publicClientPromise = (async () =>
            createPublicClient({
                chain: mendoza,
                transport: http(getRpcUrl())
            }))();
    }

    return publicClientPromise;
};

export const getArkivWebsocketTransport = async () => getWsUrl();

export const getArkivLongExpirationSeconds = async () => ARKIV_LONG_EXPIRATION_SECONDS;

