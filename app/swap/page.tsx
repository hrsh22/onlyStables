"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAccount, useDisconnect } from "wagmi";
import { generatePaymentMetadata, type PaymentMetadata } from "@/lib/ai-utils";
import { executeCrossChainSwap, fetchRecommendedFees, type SwapDetails } from "@/lib/onlyswaps-client";
import { bsc } from "viem/chains";

type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    metadata?: PaymentMetadata;
    timestamp: Date;
};

export default function Swap() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "1",
            role: "assistant",
            content:
                "Hey! 👋 I'm your AI payment assistant. Just tell me what you want to pay and I'll handle the rest. Try: 'Pay John $50 for rent on Polygon'",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isConnected) {
            router.push("/");
        }
    }, [isConnected, router]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const formatAddress = (addr: string | undefined) => {
        if (!addr) return "";
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const handleSend = useCallback(async () => {
        if (!input.trim() || isProcessing || !address) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsProcessing(true);

        try {
            // Step 1: Generate payment metadata using AI
            const metadata = await generatePaymentMetadata(userMessage.content);

            // Mandatory console log for AI-detected purpose
            console.log(JSON.stringify(metadata, null, 2));

            // Step 2: Extract destination chain from user input (mock for now)
            // In production, this would be parsed from the AI response or user input
            const destChainMap: Record<string, number> = {
                polygon: 137,
                ethereum: 1,
                arbitrum: 42161,
                optimism: 10,
                avalanche: 43114,
                base: 8453
            };

            const inputLower = userMessage.content.toLowerCase();
            let destChainId = 137; // Default to Polygon
            for (const [chainName, chainId] of Object.entries(destChainMap)) {
                if (inputLower.includes(chainName)) {
                    destChainId = chainId;
                    break;
                }
            }

            // Step 3: Fetch recommended fees (mock OnlySwaps integration)
            const feeInfo = await fetchRecommendedFees(
                bsc.id, // Source: BNB Chain
                destChainId,
                metadata.amount
            );

            // Step 4: Show processing message
            const processingMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: `✨ Got it! Processing your payment:\n\n**Purpose:** ${metadata.purpose}\n**Amount:** $${metadata.amount}\n**Recipient:** ${metadata.recipient}\n**Route:** BNB Chain → ${
                    Object.keys(destChainMap)
                        .find((k) => destChainMap[k] === destChainId)
                        ?.toUpperCase() || "Chain " + destChainId
                }\n**Total Fee:** ${feeInfo.totalFee}\n\n⏳ Submitting transaction...`,
                metadata,
                timestamp: new Date()
            };
            setMessages((prev) => [...prev, processingMessage]);

            // Step 5: Execute cross-chain swap (mock)
            const swapDetails: SwapDetails = {
                sourceChainId: bsc.id,
                destChainId,
                recipient: metadata.recipient,
                amount: metadata.amount,
                fee: feeInfo.totalFee
            };

            const requestId = await executeCrossChainSwap(swapDetails);

            // Step 6: Show success message
            const successMessage: ChatMessage = {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: `🎉 Payment submitted successfully!\n\n**Request ID:** ${requestId}\n**Status:** Pending confirmation\n\nYour ${metadata.purpose} of $${metadata.amount} is being processed. You'll be notified once it's confirmed on the destination chain.`,
                metadata,
                timestamp: new Date()
            };
            setMessages((prev) => [...prev, successMessage]);
        } catch (error) {
            console.error("Payment error:", error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 3).toString(),
                role: "assistant",
                content: `😅 Oops! Something went wrong:\n\n${error instanceof Error ? error.message : "Unknown error occurred"}\n\nPlease try again or check your connection.`,
                timestamp: new Date()
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsProcessing(false);
        }
    }, [input, isProcessing, address]);

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isConnected) {
        return null;
    }

    return (
        <div className="bg-black min-h-screen flex flex-col overflow-hidden">
            {/* Header - Compact for Mobile */}
            <header className="pt-4 sm:pt-8 left-0 right-0 z-50 bg-transparent shrink-0">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-12 sm:h-16">
                        {/* Logo */}
                        <div className="flex items-center">
                            <span className="text-white font-bold text-xl sm:text-4xl italic">onlyStables</span>
                        </div>

                        {/* Wallet Info - Compact for Mobile */}
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <div className="border border-[#ff6b35] rounded-full px-2 sm:px-4 py-1 sm:py-2 text-[#ff6b35] font-medium text-xs sm:text-sm">
                                <span className="hidden sm:inline">{formatAddress(address)}</span>
                                <span className="sm:hidden">{address ? `${address.slice(0, 4)}...` : ""}</span>
                            </div>
                            <button
                                onClick={() => disconnect()}
                                className="border border-[#ff6b35] rounded-full px-2 sm:px-4 py-1 sm:py-2 text-[#ff6b35] font-medium text-xs sm:text-sm hover:bg-[#ff6b35] hover:text-black transition-colors">
                                <span className="hidden sm:inline">Disconnect</span>
                                <span className="sm:hidden">DC</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content - Mobile Optimized */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Agent Image - Centered, Prominent */}
                <div className="shrink-0 flex items-center justify-center px-4 py-4 sm:py-8">
                    <div className="relative w-full max-w-[280px] sm:max-w-[400px] aspect-square">
                        <Image src="/agent.png" alt="AI Payment Assistant" fill className="object-contain rounded-full" priority />
                    </div>
                </div>

                {/* Chat Messages - Scrollable Area Below Agent */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-4 min-h-0">
                    <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
                        {messages.map((message) => (
                            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 sm:px-5 py-2 sm:py-3 ${
                                        message.role === "user" ? "bg-[#ff6b35] text-gray-900" : "bg-[#2a2a2a] text-white"
                                    }`}>
                                    <div className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">{message.content}</div>
                                    {message.metadata && (
                                        <div className="mt-2 pt-2 border-t border-gray-600 text-[10px] sm:text-xs text-gray-400">
                                            <div>Purpose: {message.metadata.purpose}</div>
                                            <div>Amount: ${message.metadata.amount}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="flex justify-start">
                                <div className="bg-[#2a2a2a] text-white rounded-2xl px-4 sm:px-5 py-2 sm:py-3">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-[#ff6b35] rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-[#ff6b35] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                                        <div className="w-2 h-2 bg-[#ff6b35] rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area - Fixed at Bottom */}
                <div className="shrink-0 bg-[#1a1a1a] border-t border-gray-800 px-4 sm:px-6 py-4 sm:py-6">
                    <div className="max-w-2xl mx-auto">
                        <div className="flex items-end space-x-2 sm:space-x-3">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="What do you want me to do?"
                                className="flex-1 bg-[#2a2a2a] text-white rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2 sm:py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#ff6b35] placeholder-gray-500 text-sm sm:text-base min-h-[50px] sm:min-h-[60px] max-h-[120px] sm:max-h-[200px]"
                                rows={1}
                                disabled={isProcessing}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isProcessing}
                                className="bg-[#ff6b35] text-gray-900 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-2 sm:py-3 font-bold hover:bg-[#ff8555] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[70px] sm:min-w-[100px] h-[50px] sm:h-[60px]">
                                {isProcessing ? (
                                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <span className="text-sm sm:text-base">Send</span>
                                )}
                            </button>
                        </div>
                        <div className="mt-2 text-[10px] sm:text-xs text-gray-500 text-center">
                            💡 Try: &quot;Pay Alice $100 for dinner on Polygon&quot;
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
