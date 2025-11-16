"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Ubuntu } from "next/font/google";
import Image from "next/image";
import type { TransactionResponseItem } from "../api/transactions/route";

const ubuntu = Ubuntu({
    weight: ["300", "400", "500", "700"],
    subsets: ["latin"],
    variable: "--font-ubuntu"
});

type Transaction = {
    entityKey: string;
    amount: string;
    token: string;
    recipient: string;
    destinationChainName: string;
    sourceChainName: string;
    requestId: string;
    purpose: string | null;
    createdAt: string;
    txHash: string | null;
};

export default function Account() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMounted, setHasMounted] = useState(false);

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
        if (!hasMounted) {
            return;
        }

        if (!isConnected || !address) {
            setTransactions([]);
            setIsLoading(false);
            setError(null);
            return;
        }

        let isCancelled = false;

        const fetchTransactions = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/transactions?limit=25&initiator=${encodeURIComponent(address.toLowerCase())}`);
                const payload = await response.json();

                if (!response.ok) {
                    throw new Error(payload.error || "Failed to load transaction history");
                }

                if (!isCancelled) {
                    const items: TransactionResponseItem[] = Array.isArray(payload.data) ? payload.data : [];
                    const normalized: Transaction[] = items.map((item) => ({
                        entityKey: item.entityKey,
                        amount: item.amount,
                        token: item.token,
                        recipient: item.recipient,
                        destinationChainName: item.destinationChainName,
                        sourceChainName: item.sourceChainName,
                        requestId: item.requestId,
                        purpose: item.purpose ?? null,
                        createdAt: item.createdAt,
                        txHash: item.txHash ?? null
                    }));
                    setTransactions(normalized);
                }
            } catch (err) {
                if (!isCancelled) {
                    setTransactions([]);
                    setError(err instanceof Error ? err.message : "Failed to load transaction history");
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchTransactions();

        return () => {
            isCancelled = true;
        };
    }, [hasMounted, isConnected, address]);

    const formatDate = (date: string) => {
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(date));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "text-green-400";
            case "pending":
                return "text-yellow-400";
            case "failed":
                return "text-red-400";
            default:
                return "text-white";
        }
    };

    if (!hasMounted) {
        return null;
    }

    if (!isConnected) {
        return null;
    }

    return (
        <div className={`bg-black min-h-screen flex flex-col relative ${ubuntu.variable} font-sans`} style={{ fontFamily: "var(--font-ubuntu)" }}>
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

            {/* Header */}
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

                        {/* Back Button */}
                        <button
                            onClick={() => router.push("/swap")}
                            className="border border-[#ff6b35] rounded-full px-4 py-2 text-[#ff6b35] font-medium text-sm uppercase hover:bg-[#ff6b35] hover:text-black transition-colors cursor-pointer">
                            BACK
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Title */}
                <div className="mb-8">
                    <h1 className="text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold uppercase mb-4 leading-none">ACCOUNT</h1>
                    {address && <p className="text-white/60 text-sm sm:text-base font-mono">{address}</p>}
                </div>

                {/* Transactions List */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <p className="text-white/60 text-lg uppercase">LOADING TRANSACTIONS...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-red-400 text-sm sm:text-base uppercase">{error}</p>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-white/60 text-lg uppercase">NO TRANSACTIONS YET</p>
                        </div>
                    ) : (
                        transactions.map((tx) => {
                            const chainLabel = `${tx.sourceChainName.toUpperCase()} → ${tx.destinationChainName.toUpperCase()}`;
                            const recipientLabel = `${tx.recipient.slice(0, 6)}...${tx.recipient.slice(-4)}`;
                            const truncatedRequestId = tx.requestId.length > 18 ? `${tx.requestId.slice(0, 12)}...` : tx.requestId;

                            return (
                                <div
                                    key={tx.entityKey}
                                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 sm:p-6 hover:bg-white/10 transition-colors">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-white text-lg sm:text-xl font-bold uppercase">USDT PAYMENT</span>
                                                <span className={`text-xs sm:text-sm font-medium uppercase ${getStatusColor("completed")}`}>
                                                    COMPLETED
                                                </span>
                                            </div>
                                            <div className="text-white/80 text-sm sm:text-base space-y-1">
                                                <div>
                                                    <span className="text-[#ff6b35] font-bold">
                                                        {tx.amount} {tx.token}
                                                    </span>
                                                </div>
                                                <div className="text-xs sm:text-sm font-mono text-white/60">To: {recipientLabel}</div>
                                                <div className="text-xs sm:text-sm text-white/60 uppercase">Route: {chainLabel}</div>
                                                {tx.purpose && <div className="text-xs sm:text-sm text-white/60">Purpose: {tx.purpose}</div>}
                                                <div className="text-xs sm:text-sm text-white/60 font-mono">Request ID: {truncatedRequestId}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-white/60 text-xs sm:text-sm mb-2">{formatDate(tx.createdAt)}</div>
                                            {tx.txHash && <div className="text-[#ff6b35] text-xs font-mono">{tx.txHash.slice(0, 10)}...</div>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
