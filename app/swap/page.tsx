"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Ubuntu } from "next/font/google";
import { useAccount } from "wagmi";

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

export default function Swap() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isConnected) {
            router.push("/");
        }
    }, [isConnected, router]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

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
                                className="border border-[#ff6b35] rounded-full px-4 py-2 text-[#ff6b35] font-medium text-sm uppercase hover:bg-[#ff6b35] hover:text-black transition-colors">
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
                            <Image src="/agent.png" alt="AI Payment Assistant" fill className="object-cover" priority />
                        </div>
                    </div>

                    {/* Greeting Section */}
                    <div className="text-center lg:text-left">
                        <div className="flex flex-row items-baseline gap-3">
                            <span className="text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-9xl 2xl:text-9xl font-bold leading-none uppercase">
                                HI
                            </span>
                            {address && (
                                <span className="text-white/60 text-xs sm:text-sm md:text-base font-mono tracking-wider">
                                    {address.slice(0, 6)}...{address.slice(-4)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Section - Chat (Mobile: Bottom, Desktop: Right) */}
                <div className="flex-1 flex flex-col min-h-0 lg:w-1/2 overflow-hidden">
                    {/* Chat Messages - Scrollable Area */}
                    <div className="flex-1 overflow-y-auto min-h-0 py-4 scrollbar-thin scrollbar-thumb-[#ff6b35]/50 scrollbar-track-transparent">
                        <div className="space-y-3">
                            {messages.map((message) => (
                                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className="max-w-[85%]">
                                        <div className="whitespace-pre-wrap text-sm sm:text-base text-white leading-relaxed">{message.content}</div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Input Area - Above SEND button */}
                    <div className="shrink-0 pb-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="WHAT DO YOU WANT ME TO DO?"
                            className="w-full bg-transparent border-b border-[#ff6b35]/50 text-white placeholder-white/50 text-sm sm:text-base py-2 focus:outline-none focus:border-[#ff6b35]"
                        />
                    </div>

                    {/* Bottom Button - Matching Home Page Style */}
                    <div className="shrink-0 pb-6 pt-2">
                        <button
                            disabled={!input.trim()}
                            className="w-full border border-[#ff6b35] rounded-full px-6 py-3 text-[#ff6b35] font-medium text-base hover:bg-[#ff6b35] hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            SEND
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
