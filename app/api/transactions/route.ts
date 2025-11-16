"use server";

import { NextRequest, NextResponse } from "next/server";
import type { Attribute, Entity, Hex } from "@arkiv-network/sdk";
import { stringToPayload } from "@arkiv-network/sdk/utils";
import { eq } from "@arkiv-network/sdk/query";

import {
    getArkivLongExpirationSeconds,
    getArkivOwnerAddress,
    getArkivPublicClient,
    getArkivWalletClient
} from "@/lib/arkiv";

type TransactionRequestBody = {
    recipient: string;
    amount: string | number | bigint;
    token: string;
    destinationChainId: string | number | bigint;
    destinationChainName: string;
    sourceChainId: string | number | bigint;
    sourceChainName: string;
    requestId: string;
    txHash?: string | null;
    purpose?: string | null;
    createdAt?: string;
    initiator?: string;
};

export type TransactionRecord = {
    recipient: string;
    amount: string;
    token: string;
    destinationChainId: string;
    destinationChainName: string;
    sourceChainId: string;
    sourceChainName: string;
    requestId: string;
    txHash: string | null;
    purpose: string | null;
    createdAt: string;
    initiator: string;
};

export type TransactionResponseItem = TransactionRecord & {
    entityKey: string;
};

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

const requiredFields: Array<keyof TransactionRequestBody> = [
    "recipient",
    "amount",
    "token",
    "destinationChainId",
    "destinationChainName",
    "sourceChainId",
    "sourceChainName",
    "requestId",
    "initiator"
];

const normalizeString = (value: string | number | bigint) => value.toString();

const buildAttributes = (record: TransactionRecord): Attribute[] => [
    { key: "type", value: "transaction" },
    { key: "recipient", value: record.recipient },
    { key: "amount", value: record.amount },
    { key: "token", value: record.token },
    { key: "destinationChainId", value: record.destinationChainId },
    { key: "destinationChainName", value: record.destinationChainName },
    { key: "sourceChainId", value: record.sourceChainId },
    { key: "sourceChainName", value: record.sourceChainName },
    { key: "requestId", value: record.requestId },
    { key: "purpose", value: record.purpose ?? "" },
    { key: "initiator", value: record.initiator },
    { key: "createdAt", value: record.createdAt }
];

const parseEntity = (entity: Entity): TransactionResponseItem => {
    let parsedPayload: Partial<TransactionRecord> = {};

    try {
        parsedPayload = entity.toJson() as TransactionRecord;
    } catch (error) {
        console.warn("Unable to parse Arkiv payload JSON", error);
    }

    const attributeMap = new Map(
        (entity.attributes ?? []).map((attribute) => [attribute.key, attribute.value?.toString() ?? ""])
    );

    const getValue = (key: keyof TransactionRecord, fallback = "") =>
        (parsedPayload[key] as string | null | undefined) ?? attributeMap.get(key) ?? fallback;

    return {
        entityKey: entity.key,
        recipient: getValue("recipient"),
        amount: getValue("amount"),
        token: getValue("token"),
        destinationChainId: getValue("destinationChainId"),
        destinationChainName: getValue("destinationChainName"),
        sourceChainId: getValue("sourceChainId"),
        sourceChainName: getValue("sourceChainName"),
        requestId: getValue("requestId"),
        txHash: getValue("txHash") || null,
        purpose: getValue("purpose") || null,
        createdAt: getValue("createdAt"),
        initiator: getValue("initiator")
    };
};

const validateBody = (body: Partial<TransactionRequestBody>) => {
    for (const field of requiredFields) {
        if (body[field] === undefined || body[field] === null || body[field] === "") {
            return `Missing required field: ${String(field)}`;
        }
    }
    return null;
};

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as Partial<TransactionRequestBody>;
        const validationError = validateBody(body);

        if (validationError) {
            return NextResponse.json({ error: validationError }, { status: 400 });
        }

        const record: TransactionRecord = {
            recipient: body.recipient!.toLowerCase(),
            amount: normalizeString(body.amount!),
            token: body.token!.toUpperCase(),
            destinationChainId: normalizeString(body.destinationChainId!),
            destinationChainName: body.destinationChainName!.toLowerCase(),
            sourceChainId: normalizeString(body.sourceChainId!),
            sourceChainName: body.sourceChainName!.toLowerCase(),
            requestId: body.requestId!,
            txHash: body.txHash ?? null,
            purpose: body.purpose ?? null,
            createdAt: body.createdAt ?? new Date().toISOString(),
            initiator: (body.initiator ?? "").toLowerCase()
        };
        if (!record.initiator) {
            return NextResponse.json({ error: "Missing initiator" }, { status: 400 });
        }

        const walletClient = await getArkivWalletClient();

        const { entityKey, txHash } = await walletClient.createEntity({
            payload: stringToPayload(JSON.stringify(record)),
            attributes: buildAttributes(record),
            contentType: "application/json",
            expiresIn: Number(
                process.env.ARKIV_TRANSACTION_TTL ?? (await getArkivLongExpirationSeconds())
            )
        });

        return NextResponse.json({
            success: true,
            entityKey,
            arkivTxHash: txHash
        });
    } catch (error) {
        console.error("Failed to persist transaction in Arkiv:", error);
        return NextResponse.json(
            { error: "Failed to persist transaction history item" },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limitParam = Number(searchParams.get("limit"));
        const limit = Number.isFinite(limitParam) ? limitParam : DEFAULT_LIMIT;
        const safeLimit = Math.min(Math.max(Math.floor(limit), 1), MAX_LIMIT);
        const initiatorFilter = searchParams.get("initiator")?.toLowerCase() ?? null;

        // Security: Require initiator parameter to prevent querying all transactions
        // All transactions are stored under the server's Arkiv wallet, so filtering by
        // initiator (the connected wallet address) is essential for privacy
        if (!initiatorFilter) {
            return NextResponse.json({ error: "initiator parameter is required" }, { status: 400 });
        }

        // Validate initiator is a valid Ethereum address format
        if (!/^0x[a-f0-9]{40}$/.test(initiatorFilter)) {
            return NextResponse.json({ error: "Invalid initiator address format" }, { status: 400 });
        }

        const [publicClient, ownerAddress] = await Promise.all([getArkivPublicClient(), getArkivOwnerAddress()]);

        const predicates = [eq("type", "transaction"), eq("initiator", initiatorFilter)];

        const query = publicClient
            .buildQuery()
            .withAttributes(true)
            .withPayload(true)
            .ownedBy(ownerAddress as Hex)
            .where(predicates)
            .orderBy("createdAt", "string", "desc")
            .limit(safeLimit);

        const { entities } = await query.fetch();

        return NextResponse.json({
            success: true,
            data: entities.map(parseEntity)
        });
    } catch (error) {
        console.error("Failed to fetch Arkiv transactions:", error);
        return NextResponse.json({ error: "Failed to load transaction history" }, { status: 500 });
    }
}


