"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Ubuntu } from "next/font/google";
import { useAccount, useWalletClient, useSwitchChain } from "wagmi";
import { bsc, base } from "viem/chains";
import { createPublicClient, http, type WalletClient } from "viem";
import { RouterClient, ViemChainBackend, fetchRecommendedFees } from "onlyswaps-js";

const USDT_DECIMALS = 6;

const SOURCE_CHAIN_ID = BigInt(bsc.id);
const SOURCE_CHAIN_NAME = "bnb";

type TokenProperty = "USDT_ADDRESS" | "USDFC_ADDRESS";

const ONLYSWAPS_CHAIN_CONFIG = {
    base: {
        id: BigInt(base.id),
        constantsKey: "BASE_MAINNET",
        tokenProperty: "USDT_ADDRESS" as TokenProperty,
        displayName: "Base"
    },
    avalanche: {
        id: BigInt(43114),
        constantsKey: "AVAX_MAINNET",
        tokenProperty: "USDT_ADDRESS" as TokenProperty,
        displayName: "Avalanche"
    },
    arbitrum: {
        id: BigInt(42161),
        constantsKey: "ARBITRUM_MAINNET",
        tokenProperty: "USDT_ADDRESS" as TokenProperty,
        displayName: "Arbitrum One"
    },
    optimism: {
        id: BigInt(10),
        constantsKey: "OPTIMISM_MAINNET",
        tokenProperty: "USDT_ADDRESS" as TokenProperty,
        displayName: "Optimism"
    },
    ethereum: {
        id: BigInt(1),
        constantsKey: "ETHEREUM_MAINNET",
        tokenProperty: "USDT_ADDRESS" as TokenProperty,
        displayName: "Ethereum"
    },
    bnb: {
        id: BigInt(bsc.id),
        constantsKey: "BSC_MAINNET",
        tokenProperty: "USDT_ADDRESS" as TokenProperty,
        displayName: "BNB Smart Chain"
    },
    filecoin: {
        id: BigInt(314),
        constantsKey: "FILECOIN_MAINNET",
        tokenProperty: "USDFC_ADDRESS" as TokenProperty,
        displayName: "Filecoin"
    },
    linea: {
        id: BigInt(59144),
        constantsKey: "LINEA_MAINNET",
        tokenProperty: "USDT_ADDRESS" as TokenProperty,
        displayName: "Linea"
    },
    scroll: {
        id: BigInt(534352),
        constantsKey: "SCROLL_MAINNET",
        tokenProperty: "USDT_ADDRESS" as TokenProperty,
        displayName: "Scroll"
    }
} as const;

type SupportedChainKey = keyof typeof ONLYSWAPS_CHAIN_CONFIG;

const DEFAULT_DESTINATION_CHAIN_KEY: SupportedChainKey = "base";

const CHAIN_ALIAS_MAP = Object.fromEntries([
    ...(Object.keys(ONLYSWAPS_CHAIN_CONFIG) as SupportedChainKey[]).map((key) => [key, key]),
    ["base chain", "base"],
    ["base network", "base"],
    ["avax", "avalanche"],
    ["avax c-chain", "avalanche"],
    ["avalanche c-chain", "avalanche"],
    ["arbitrum one", "arbitrum"],
    ["arbitrum network", "arbitrum"],
    ["eth", "ethereum"],
    ["eth mainnet", "ethereum"],
    ["ethereum mainnet", "ethereum"],
    ["bnb chain", "bnb"],
    ["bnb smart chain", "bnb"],
    ["binance smart chain", "bnb"],
    ["bsc", "bnb"],
    ["linea mainnet", "linea"],
    ["scroll mainnet", "scroll"],
    ["optimism mainnet", "optimism"],
    ["optimism network", "optimism"],
    ["filecoin mainnet", "filecoin"]
]) as Record<string, SupportedChainKey>;

const SUPPORTED_CHAIN_DISPLAY_LIST = Object.values(ONLYSWAPS_CHAIN_CONFIG)
    .map((chain) => chain.displayName)
    .join(", ");

const DESTINATION_CHAIN_ID_TO_DISPLAY_NAME: Record<string, string> = Object.fromEntries(
    Object.values(ONLYSWAPS_CHAIN_CONFIG).map((config) => [config.id.toString(), config.displayName])
);

const formatAmountFromMinorUnits = (amount: bigint, decimals = USDT_DECIMALS) => {
    const baseUnit = BigInt(10) ** BigInt(decimals);
    const whole = amount / baseUnit;
    const fraction = amount % baseUnit;

    if (fraction === BigInt(0)) {
        return whole.toString();
    }

    const fractionStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
    return `${whole.toString()}.${fractionStr || "0"}`;
};

const toMinorUnits = (amount: string, decimals = USDT_DECIMALS) => {
    const [wholePartRaw, fractionPartRaw = ""] = amount.split(".");
    const wholePart = wholePartRaw && wholePartRaw !== "" ? wholePartRaw : "0";
    const sanitizedFraction = (fractionPartRaw ?? "").padEnd(decimals, "0").slice(0, decimals);
    const baseUnit = BigInt(10) ** BigInt(decimals);
    const whole = BigInt(wholePart);
    const fraction = sanitizedFraction ? BigInt(sanitizedFraction) : BigInt(0);
    return whole * baseUnit + fraction;
};

const USER_REJECTION_PATTERNS = ["user rejected the request", "user denied transaction signature"];

const formatUserFacingError = (input: unknown): string => {
    if (!input) {
        return "Swap failed. Please try again.";
    }

    const message = typeof input === "string" ? input : input instanceof Error ? input.message : typeof input === "number" ? input.toString() : "";
    const trimmed = message.trim();

    if (!trimmed) {
        return "Swap failed. Please try again.";
    }

    const lower = trimmed.toLowerCase();
    if (USER_REJECTION_PATTERNS.some((pattern) => lower.includes(pattern))) {
        return "Transaction request was rejected in your wallet.";
    }

    // Always show unsupported chain errors in full
    if (lower.includes("not supported") && lower.includes("supported chains")) {
        const firstLine = trimmed.split("\n")[0]?.trim();
        return firstLine || "Swap failed. Please try again.";
    }

    const firstLine = trimmed.split("\n")[0]?.trim();
    if (!firstLine) {
        return "Swap failed. Please try again.";
    }

    if (firstLine.length > 180) {
        return "Swap failed. Please try again.";
    }

    return firstLine;
};

const getChainDisplayNameFromKey = (key: SupportedChainKey): string => ONLYSWAPS_CHAIN_CONFIG[key].displayName;

const ubuntu = Ubuntu({
    weight: ["300", "400", "500", "700"],
    subsets: ["latin"],
    variable: "--font-ubuntu"
});

type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
};

type ExecuteParams = {
    recipient: `0x${string}`;
    sourceToken: `0x${string}`;
    destinationToken: `0x${string}`;
    destinationChainId: bigint;
    amount: bigint;
};

export default function Swap() {
    const router = useRouter();
    const { address, isConnected, chainId } = useAccount();
    const { data: walletClient } = useWalletClient();
    const { switchChain } = useSwitchChain();
    const [hasMounted, setHasMounted] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "1",
            role: "assistant",
            content:
                "Hey! I'm your AI payment assistant. I can help you send cross-chain USDT payments. Just tell me who to send to, how much, and which chain.",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [transactionStatus, setTransactionStatus] = useState<"idle" | "parsing" | "executing" | "success" | "error">("idle");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageIdCounter = useRef(0);

    // Helper to generate unique message IDs
    const generateMessageId = () => {
        messageIdCounter.current += 1;
        return `${Date.now()}-${messageIdCounter.current}`;
    };

    // Map transaction status to animation file
    const getAnimationImage = (status: "idle" | "parsing" | "executing" | "success" | "error"): string => {
        switch (status) {
            case "idle":
                return "/animation/0_eyes.webp";
            case "parsing":
                return "/animation/1_wave.webp";
            case "executing":
                return "/animation/2_tx.webp";
            case "success":
                return "/animation/3_done.webp";
            case "error":
                return "/animation/0_eyes.webp";
            default:
                return "/animation/0_eyes.webp";
        }
    };

    const clientSetup = async (accountAddress: `0x${string}`, walletClient: WalletClient): Promise<RouterClient> => {
        if (!accountAddress) {
            throw new Error("Account address is required");
        }

        if (!walletClient) {
            throw new Error("Wallet client is required");
        }

        // Ensure wallet client is on BNB Chain
        if (walletClient.chain?.id !== bsc.id) {
            throw new Error("Please switch to BNB Chain");
        }

        console.log("=== Setting Up OnlySwaps Client ===");
        console.log("Account address:", accountAddress);
        console.log("Chain:", bsc.name, "(Chain ID:", bsc.id + ")");

        // Create public client for reading blockchain state
        const publicClient = createPublicClient({
            chain: bsc,
            transport: http() // Uses default RPC or configure custom RPC: "https://bsc-dataseed1.binance.org"
        });

        // Use the wallet client from wagmi (MetaMask connection)
        // Ensure wallet client has an account and chain
        if (!walletClient.account || !walletClient.chain) {
            throw new Error("Wallet client account or chain is not available");
        }

        // Create the only swaps backend
        // Type assertion needed because ViemChainBackend expects specific wallet client type
        // and wagmi's walletClient transport type may not match exactly
        // Using type assertion to bypass type incompatibility between wagmi and onlyswaps-js
        const backend = new ViemChainBackend(
            accountAddress,
            publicClient,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            walletClient as any
        );

        // Try to get BSC router address from onlyswaps-js constants
        // Check for different possible constant names
        let routerAddress: `0x${string}`;

        try {
            const onlyswapsJs = await import("onlyswaps-js");

            // Try to find BSC constants (may be exported as BSC, BNB_CHAIN, BSC_MAINNET, etc.)
            type OnlySwapsConstants = {
                ROUTER_ADDRESS?: `0x${string}`;
            };

            const bscConstants =
                ((onlyswapsJs as Record<string, unknown>).BSC as OnlySwapsConstants | undefined) ||
                ((onlyswapsJs as Record<string, unknown>).BNB_CHAIN as OnlySwapsConstants | undefined) ||
                ((onlyswapsJs as Record<string, unknown>).BSC_MAINNET as OnlySwapsConstants | undefined) ||
                ((onlyswapsJs as Record<string, unknown>).BSC_TESTNET as OnlySwapsConstants | undefined);

            if (bscConstants?.ROUTER_ADDRESS) {
                routerAddress = bscConstants.ROUTER_ADDRESS;
                console.log("Router address:", routerAddress);
            } else {
                // Fallback: Use placeholder - MUST be updated with actual BSC router address
                console.warn("BSC constants not found in onlyswaps-js. Using placeholder router address.");
                routerAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`;
            }
        } catch (error) {
            console.error("Failed to import onlyswaps-js constants:", error);
            // Fallback router address - MUST be updated with actual BSC router address
            routerAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`;
        }

        // Create the router client
        const router = new RouterClient({ routerAddress }, backend);

        console.log("Router client initialized successfully");

        return router;
    };

    const getOptimalFees = async (params: {
        sourceToken: `0x${string}`;
        destinationToken: `0x${string}`;
        destinationChainId: bigint;
        amount: bigint;
    }) => {
        const { sourceToken, destinationToken, destinationChainId, amount } = params;

        console.log("=== Fetching Recommended Fees ===");
        console.log("Source token:", sourceToken);
        console.log("Destination token:", destinationToken);
        console.log("Source chain ID:", bsc.id, "(BNB Chain)");
        console.log("Destination chain ID:", destinationChainId.toString());
        console.log("Amount:", amount.toString());

        const feeRequest = {
            sourceToken,
            destinationToken,
            sourceChainId: BigInt(bsc.id),
            destinationChainId,
            amount
        };

        try {
            const feeResponse = await fetchRecommendedFees(feeRequest);

            console.log("Recommended fees:", {
                solverFee: feeResponse.fees.solver,
                networkFee: feeResponse.fees.network,
                totalFee: feeResponse.fees.total,
                amountToTransfer: feeResponse.transferAmount,
                amountToApprove: feeResponse.approvalAmount
            });

            return {
                ...feeResponse,
                success: true
            };
        } catch (error) {
            console.error("Failed to fetch recommended fees:", error);
            throw new Error(error instanceof Error ? error.message : "Failed to fetch recommended fees");
        }
    };

    const executeSwap = async (
        router: RouterClient,
        params: {
            recipient: `0x${string}`;
            srcToken: `0x${string}`;
            destToken: `0x${string}`;
            amount: bigint;
            fee: bigint;
            destChainId: bigint;
        }
    ): Promise<string> => {
        const { recipient, srcToken, destToken, amount, fee, destChainId } = params;

        console.log("=== Executing Cross-Chain Swap ===");
        console.log("Recipient:", recipient);
        console.log("Source token:", srcToken);
        console.log("Destination token:", destToken);
        console.log("Amount:", amount.toString());
        console.log("Fee:", fee.toString());
        console.log("Source chain ID:", bsc.id, "(BNB Chain)");
        console.log("Destination chain ID:", destChainId.toString());

        try {
            const swapRequest = {
                recipient,
                srcToken,
                destToken,
                amount,
                fee,
                destChainId
            };

            // The swap method handles:
            // 1. Token approval
            // 2. Swap execution
            // 3. Returns request ID for tracking
            const { requestId } = await router.swap(swapRequest);

            console.log("Swap request submitted:", requestId);
            return requestId;
        } catch (error) {
            console.error("Swap failed:", error);
            throw new Error(error instanceof Error ? error.message : "Swap execution failed");
        }
    };

    const execute = async (params: ExecuteParams): Promise<{ requestId: string; success: boolean; error?: string }> => {
        const { recipient, sourceToken, destinationToken, destinationChainId, amount } = params;

        // Validate wallet connection
        if (!address) {
            return {
                requestId: "",
                success: false,
                error: "Wallet not connected. Please connect your wallet first."
            };
        }

        if (!walletClient) {
            return {
                requestId: "",
                success: false,
                error: "Wallet client not available. Please ensure your wallet is connected and try again."
            };
        }

        try {
            console.log("=== Starting Cross-Chain Swap Execution ===");
            console.log("Recipient:", recipient);
            console.log("Source token:", sourceToken);
            console.log("Destination token:", destinationToken);
            console.log("Amount:", amount.toString());
            console.log("Destination chain ID:", destinationChainId.toString());

            // Step 1: Setup router client
            console.log("\n[Step 1/3] Setting up router client...");
            const router = await clientSetup(address, walletClient);

            // Step 2: Fetch optimal fees
            console.log("\n[Step 2/3] Fetching optimal fees...");
            const feeResponse = await getOptimalFees({
                sourceToken,
                destinationToken,
                destinationChainId,
                amount
            });

            // Step 3: Execute swap with the fetched fees
            console.log("\n[Step 3/3] Executing swap...");
            const requestId = await executeSwap(router, {
                recipient,
                srcToken: sourceToken,
                destToken: destinationToken,
                amount,
                fee: feeResponse.fees.solver,
                destChainId: destinationChainId
            });

            console.log("\n=== Swap Execution Completed Successfully ===");
            console.log("Request ID:", requestId);

            return {
                requestId,
                success: true
            };
        } catch (error) {
            console.error("\n=== Swap Execution Failed ===");
            console.error("Error:", error);
            return {
                requestId: "",
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred"
            };
        }
    };

    /**
     * Parses user input using OpenAI API and generates execute function parameters
     *
     * @param userInput - Natural language input from user
     * @returns Execute parameters or null if parsing fails
     */
    const parseUserInput = async (userInput: string) => {
        console.log("\n=== Parsing User Input with OpenAI ===");
        console.log("Input:", userInput);

        try {
            // Call OpenAI API route
            const response = await fetch("/api/parse-payment", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userInput })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to parse input");
            }

            const result = await response.json();
            const parsed = result.data;

            console.log("OpenAI parsed data:", parsed);

            // Fallback: Try to extract address using regex if AI didn't find it
            if (!parsed.recipient) {
                const addressRegex = /0x[a-fA-F0-9]{40}/;
                const addressMatch = userInput.match(addressRegex);
                if (addressMatch) {
                    console.log("Found address via regex fallback:", addressMatch[0]);
                    parsed.recipient = addressMatch[0];
                }
            }

            // Validate parsed data with detailed error messages
            if (!parsed.recipient) {
                throw new Error(
                    "Could not find recipient address in your message. Please include an Ethereum address (0x...). Example: 0x5991fd6ecc5634c4de497b47eb0aa0065fffb2141"
                );
            }
            // Fallback: Try to extract amount using regex if AI didn't find it
            if (!parsed.amount) {
                const amountRegex = /(\d+\.?\d*)/;
                const amountMatch = userInput.match(amountRegex);
                if (amountMatch) {
                    console.log("Found amount via regex fallback:", amountMatch[1]);
                    parsed.amount = amountMatch[1];
                }
            }

            if (!parsed.amount) {
                throw new Error("Could not find amount in your message. Please specify how much you want to send (e.g., 5, 10.5, 100)");
            }
            // Token is always USDT - validate or default to USDT
            if (!parsed.token) {
                // Default to USDT if not specified
                parsed.token = "USDT";
            }
            // Ensure token is USDT (normalize any case)
            if (parsed.token.toUpperCase() !== "USDT") {
                console.warn(`Token ${parsed.token} is not supported. Defaulting to USDT.`);
                parsed.token = "USDT";
            }
            const recipient = parsed.recipient as `0x${string}`;
            const amountValue = parseFloat(parsed.amount);
            const normalizedDestinationChain = parsed.destinationChain ? parsed.destinationChain.trim().toLowerCase() : null;

            let destinationChainKey: SupportedChainKey = DEFAULT_DESTINATION_CHAIN_KEY;

            if (normalizedDestinationChain) {
                const mappedChainKey = CHAIN_ALIAS_MAP[normalizedDestinationChain];
                if (!mappedChainKey) {
                    const chainName = parsed.destinationChain.charAt(0).toUpperCase() + parsed.destinationChain.slice(1);
                    throw new Error(`${chainName} is not supported. Supported chains: ${SUPPORTED_CHAIN_DISPLAY_LIST}`);
                }
                destinationChainKey = mappedChainKey;
            } else {
                console.log("No chain specified, defaulting to Base");
            }

            const destinationChainConfig = ONLYSWAPS_CHAIN_CONFIG[destinationChainKey];

            // Validate recipient address format
            if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
                throw new Error("Invalid recipient address format");
            }

            // Convert amount to minor units
            const amountInWei = toMinorUnits(parsed.amount, USDT_DECIMALS);

            // Get destination chain ID
            const destinationChainId = destinationChainConfig.id;

            console.log("Extracted recipient:", recipient);
            console.log("Extracted amount:", amountValue, "USDT");
            console.log("Amount in wei:", amountInWei.toString());
            console.log("Extracted chain:", destinationChainKey, "(Chain ID:", destinationChainId.toString() + ")");

            // Get token addresses from onlyswaps-js constants
            let sourceToken: `0x${string}`;
            let destinationToken: `0x${string}`;

            try {
                const onlyswapsJs = await import("onlyswaps-js");

                type ChainConstants = {
                    USDT_ADDRESS?: `0x${string}`;
                    USDFC_ADDRESS?: `0x${string}`;
                };

                // BSC constants - exact constant name: BSC_MAINNET
                const bscConstants = (onlyswapsJs as Record<string, unknown>).BSC_MAINNET as ChainConstants | undefined;
                console.log("BSC_MAINNET constants:", bscConstants ? "Found" : "Not found");

                const destinationConstantsKey = destinationChainConfig.constantsKey;
                const destConstants = (onlyswapsJs as Record<string, unknown>)[destinationConstantsKey] as ChainConstants | undefined;
                console.log(`${destinationConstantsKey} constants:`, destConstants ? "Found" : "Not found");

                // Get USDT_ADDRESS from constants
                if (!bscConstants?.USDT_ADDRESS) {
                    throw new Error("BSC_MAINNET.USDT_ADDRESS not found in onlyswaps-js");
                }
                sourceToken = bscConstants.USDT_ADDRESS;

                const tokenProperty = destinationChainConfig.tokenProperty;
                const resolvedDestinationToken = destConstants?.[tokenProperty];

                if (!resolvedDestinationToken) {
                    throw new Error(`${destinationConstantsKey}.${tokenProperty} not found in onlyswaps-js`);
                }
                destinationToken = resolvedDestinationToken;

                console.log("Source token (BSC_MAINNET.USDT_ADDRESS):", sourceToken);
                console.log("Destination token:", destinationToken);
            } catch (error) {
                console.error("Failed to get token addresses:", error);
                throw error;
            }

            // Generate execute parameters
            const executeParams = {
                recipient,
                sourceToken,
                destinationToken,
                destinationChainId,
                amount: amountInWei
            };

            // Extract purpose if available
            const purpose = parsed.purpose || null;
            if (purpose) {
                console.log("Extracted purpose:", purpose);
            }

            console.log("\n=== Generated Execute Parameters ===");
            console.log(JSON.stringify(executeParams, (key, value) => (typeof value === "bigint" ? value.toString() : value), 2));

            return {
                params: executeParams,
                purpose,
                destinationChainKey
            };
        } catch (error) {
            console.error("Failed to parse user input:", error);
            throw error;
        }
    };

    const saveTransactionHistory = async ({
        params,
        purpose,
        destinationChainKey,
        requestId,
        initiator
    }: {
        params: ExecuteParams;
        purpose: string | null;
        destinationChainKey: string;
        requestId: string;
        initiator: string;
    }) => {
        try {
            const response = await fetch("/api/transactions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    recipient: params.recipient,
                    amount: formatAmountFromMinorUnits(params.amount),
                    token: "USDT",
                    destinationChainId: params.destinationChainId.toString(),
                    destinationChainName: destinationChainKey,
                    sourceChainId: SOURCE_CHAIN_ID.toString(),
                    sourceChainName: SOURCE_CHAIN_NAME,
                    requestId,
                    txHash: null,
                    purpose,
                    createdAt: new Date().toISOString(),
                    initiator: initiator.toLowerCase()
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Unknown error");
            }
        } catch (error) {
            console.error("Failed to store transaction history:", error);
            setMessages((prev) => [
                ...prev,
                {
                    id: generateMessageId(),
                    role: "assistant",
                    content: "Swap completed, but I couldn't save this transaction to your Arkiv history. Please try again later.",
                    timestamp: new Date()
                }
            ]);
        }
    };

    /**
     * Handles sending user message and executing swap
     */
    const handleSend = async () => {
        if (!input.trim() || isProcessing) return;

        // Check wallet connection before proceeding
        if (!address || !walletClient) {
            setMessages((prev) => [
                ...prev,
                {
                    id: generateMessageId(),
                    role: "assistant",
                    content: "Wallet not connected. Please connect your wallet first before sending a payment.",
                    timestamp: new Date()
                }
            ]);
            return;
        }

        // Check if user is on BNB Chain, if not, switch to BNB Chain
        if (chainId && chainId !== bsc.id) {
            try {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: generateMessageId(),
                        role: "assistant",
                        content: "Switching to BNB Chain mainnet...",
                        timestamp: new Date()
                    }
                ]);
                await switchChain({ chainId: bsc.id });
                // Wait a moment for chain switch to complete
                await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: generateMessageId(),
                        role: "assistant",
                        content:
                            "Please switch to BNB Chain mainnet in MetaMask to continue. The source chain must be BNB Chain for cross-chain swaps.",
                        timestamp: new Date()
                    }
                ]);
                setIsProcessing(false);
                return;
            }
        }

        const userMessage = input.trim();
        setInput("");
        setIsProcessing(true);

        // Add user message to chat
        setMessages((prev) => [
            ...prev,
            {
                id: generateMessageId(),
                role: "user",
                content: userMessage,
                timestamp: new Date()
            }
        ]);

        try {
            // Set status to parsing
            setTransactionStatus("parsing");

            // Parse user input with OpenAI
            const parseResult = await parseUserInput(userMessage);

            if (!parseResult || !parseResult.params) {
                throw new Error("Failed to parse payment details from your message");
            }

            const { params, purpose, destinationChainKey } = parseResult;
            const resolvedChainName = destinationChainKey
                ? getChainDisplayNameFromKey(destinationChainKey)
                : DESTINATION_CHAIN_ID_TO_DISPLAY_NAME[params.destinationChainId.toString()] || params.destinationChainId.toString();
            const amountText = `${formatAmountFromMinorUnits(params.amount)} USDT`;

            // Build confirmation message
            let confirmationMessage = `Got it! Processing your payment:\n\nRecipient: ${params.recipient.slice(0, 6)}...${params.recipient.slice(-4)}\nAmount: ${amountText}\nDestination: ${resolvedChainName.toUpperCase()}`;

            if (purpose) {
                confirmationMessage += `\nPurpose: ${purpose}`;
            }

            confirmationMessage += `\n\nExecuting swap...`;

            // Add assistant message showing parsed details
            setMessages((prev) => [
                ...prev,
                {
                    id: generateMessageId(),
                    role: "assistant",
                    content: confirmationMessage,
                    timestamp: new Date()
                }
            ]);

            // Set status to executing
            setTransactionStatus("executing");

            // Execute the swap
            const result = await execute(params);

            if (result.success) {
                // Set status to success
                setTransactionStatus("success");

                let successMessage = `Swap executed successfully!\n\nRequest ID: ${result.requestId}\nYour cross-chain payment is being processed.`;

                if (purpose) {
                    successMessage += `\n\nPurpose: ${purpose}`;
                }

                setMessages((prev) => [
                    ...prev,
                    {
                        id: generateMessageId(),
                        role: "assistant",
                        content: successMessage,
                        timestamp: new Date()
                    }
                ]);

                void saveTransactionHistory({
                    params,
                    purpose,
                    destinationChainKey: destinationChainKey,
                    requestId: result.requestId,
                    initiator: address ?? ""
                });

                // Reset to idle after 3 seconds
                setTimeout(() => {
                    setTransactionStatus("idle");
                }, 3000);
            } else {
                throw new Error(result.error || "Swap execution failed");
            }
        } catch (error) {
            // Set status to error
            setTransactionStatus("error");

            console.error("Error processing payment:", error);

            const helpfulMessage = formatUserFacingError(error);

            setMessages((prev) => [
                ...prev,
                {
                    id: generateMessageId(),
                    role: "assistant",
                    content: helpfulMessage,
                    timestamp: new Date()
                }
            ]);

            // Reset to idle after 3 seconds
            setTimeout(() => {
                setTransactionStatus("idle");
            }, 3000);
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (!hasMounted) {
            return;
        }

        if (!isConnected) {
            router.push("/");
        }
    }, [hasMounted, isConnected, router]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (!hasMounted) {
        return null;
    }

    if (!isConnected) {
        return null;
    }

    return (
        <div
            className={`bg-black h-screen flex flex-col overflow-hidden relative ${ubuntu.variable} font-sans`}
            style={{ fontFamily: "var(--font-ubuntu)" }}>
            {/* Background Image */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 opacity-20">
                    <div
                        className="w-full h-full bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage: `url("/background.svg")`
                        }}></div>
                </div>
            </div>

            {/* Header - Matching Home Page */}
            <header className="relative z-50 pt-8 left-0 right-0 bg-transparent shrink-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div
                            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => router.push("/")}>
                            <Image src="/logo.svg" alt="Logo" width={64} height={64} className="w-16 h-16" />
                            <span className="text-white font-bold text-4xl italic uppercase">onlystables</span>
                        </div>

                        {/* Account Button */}
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push("/account")}
                                className="border border-[#ff6b35] rounded-full px-4 py-2 text-[#ff6b35] font-medium text-sm uppercase hover:bg-[#ff6b35] hover:text-black transition-colors cursor-pointer">
                                ACCOUNT
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden px-4 relative z-10 max-w-7xl mx-auto w-full gap-8 lg:gap-12 min-h-0">
                {/* Left Section - Image & Title (Mobile: Top, Desktop: Left) */}
                <div className="flex flex-col items-center lg:items-start lg:justify-center shrink-0 py-6 lg:py-0 lg:w-1/2">
                    {/* Single Big Agent Image */}
                    <div className="flex justify-center lg:justify-start items-center mb-6 lg:mb-8">
                        <div className="relative w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 rounded-full overflow-hidden">
                            <Image
                                src={getAnimationImage(transactionStatus)}
                                alt="AI Payment Assistant"
                                fill
                                className="object-cover transition-opacity duration-300"
                                priority
                            />
                        </div>
                    </div>

                    {/* Greeting Section */}
                    <div className="text-center lg:text-left">
                        <div className="flex flex-col lg:flex-row items-center lg:items-baseline gap-2 lg:gap-4">
                            <span className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-none uppercase">HI</span>
                            {address && (
                                <span className="text-white/70 text-sm sm:text-base md:text-lg font-mono tracking-wider">
                                    {address.slice(0, 6)}...{address.slice(-4)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Section - Chat (Mobile: Bottom, Desktop: Right) */}
                <div className="flex-1 flex flex-col min-h-0 lg:w-1/2 overflow-hidden">
                    {/* Chat Messages - Scrollable Area */}
                    <div className="flex-1 overflow-y-auto min-h-0 py-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <div className="space-y-4 px-2">
                            {messages.map((message) => (
                                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-lg ${
                                            message.role === "user"
                                                ? "bg-[#ff6b35] text-black font-medium"
                                                : "bg-white/5 border border-white/10 text-white backdrop-blur-sm"
                                        }`}>
                                        <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed wrap-break-word overflow-wrap-break-word">
                                            {message.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Input Area - Above SEND button */}
                    <div className="shrink-0 pb-4 pt-4 border-t border-white/5">
                        <div className="mb-4">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === "Enter" && !isProcessing && input.trim()) {
                                        handleSend();
                                    }
                                }}
                                placeholder="Type your message..."
                                disabled={isProcessing}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 text-sm sm:text-base focus:outline-none focus:border-[#ff6b35] focus:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                            />
                        </div>

                        {/* Bottom Button - Matching Home Page Style */}
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isProcessing}
                            className="w-full border border-[#ff6b35] rounded-full px-6 py-3 text-[#ff6b35] font-medium text-base hover:bg-[#ff6b35] hover:text-black transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#ff6b35]">
                            {isProcessing ? "PROCESSING..." : "SEND"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
