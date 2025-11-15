"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Ubuntu } from "next/font/google";
import Image from "next/image";

const ubuntu = Ubuntu({
    weight: ["300", "400", "500", "700"],
    subsets: ["latin"],
    variable: "--font-ubuntu"
});

type Transaction = {
    id: string;
    type: "payment" | "swap" | "receive";
    amount: string;
    recipient?: string;
    chain: string;
    status: "completed" | "pending" | "failed";
    timestamp: Date;
    txHash?: string;
};

export default function Account() {
    const router = useRouter();
    const { address, isConnected } = useAccount();

    // Mock transactions data - In production, this would come from an API or blockchain
    const [transactions] = useState<Transaction[]>([
        {
            id: "1",
            type: "payment",
            amount: "50.00",
            recipient: "0x1234...5678",
            chain: "Polygon",
            status: "completed",
            timestamp: new Date(Date.now() - 86400000), // 1 day ago
            txHash: "0xabc123..."
        },
        {
            id: "2",
            type: "swap",
            amount: "100.00",
            chain: "BNB Chain → Polygon",
            status: "completed",
            timestamp: new Date(Date.now() - 172800000), // 2 days ago
            txHash: "0xdef456..."
        },
        {
            id: "3",
            type: "receive",
            amount: "25.00",
            chain: "Arbitrum",
            status: "completed",
            timestamp: new Date(Date.now() - 259200000), // 3 days ago
            txHash: "0xghi789..."
        }
    ]);

    useEffect(() => {
        if (!isConnected) {
            router.push("/");
        }
    }, [isConnected, router]);

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
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

    if (!isConnected) {
        return null;
    }

    return (
        <div
            className={`bg-black min-h-screen flex flex-col relative ${ubuntu.variable} font-sans`}
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
                            className="border border-[#ff6b35] rounded-full px-4 py-2 text-[#ff6b35] font-medium text-sm uppercase hover:bg-[#ff6b35] hover:text-black transition-colors">
                            BACK
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Title */}
                <div className="mb-8">
                    <h1 className="text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold uppercase mb-4 leading-none">
                        ACCOUNT
                    </h1>
                    {address && (
                        <p className="text-white/60 text-sm sm:text-base font-mono">
                            {address}
                        </p>
                    )}
                </div>

                {/* Transactions List */}
                <div className="space-y-4">
                    {transactions.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-white/60 text-lg uppercase">NO TRANSACTIONS YET</p>
                        </div>
                    ) : (
                        transactions.map((tx) => (
                            <div
                                key={tx.id}
                                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 sm:p-6 hover:bg-white/10 transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-white text-lg sm:text-xl font-bold uppercase">
                                                {tx.type}
                                            </span>
                                            <span className={`text-xs sm:text-sm font-medium uppercase ${getStatusColor(tx.status)}`}>
                                                {tx.status}
                                            </span>
                                        </div>
                                        <div className="text-white/80 text-sm sm:text-base">
                                            <div className="mb-1">
                                                <span className="text-[#ff6b35] font-bold">${tx.amount}</span>
                                            </div>
                                            {tx.recipient && (
                                                <div className="text-xs sm:text-sm font-mono text-white/60">
                                                    To: {tx.recipient}
                                                </div>
                                            )}
                                            <div className="text-xs sm:text-sm text-white/60 mt-1">
                                                {tx.chain}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-white/60 text-xs sm:text-sm mb-2">
                                            {formatDate(tx.timestamp)}
                                        </div>
                                        {tx.txHash && (
                                            <div className="text-[#ff6b35] text-xs font-mono">
                                                {tx.txHash.slice(0, 10)}...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

