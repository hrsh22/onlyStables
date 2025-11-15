"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConnect, useAccount } from "wagmi";

export default function Home() {
    const router = useRouter();
    const { connect, connectors } = useConnect();
    const { isConnected } = useAccount();
    const shouldNavigateRef = useRef(false);

    useEffect(() => {
        if (shouldNavigateRef.current && isConnected) {
            router.push("/swap");
            shouldNavigateRef.current = false;
        }
    }, [isConnected, router]);

    const connectMetaMask = () => {
        if (isConnected) {
            router.push("/swap");
            return;
        }

        const metaMaskConnector = connectors.find((connector) => connector.id === "injected" || connector.name === "MetaMask");

        if (metaMaskConnector) {
            shouldNavigateRef.current = true;
            connect({ connector: metaMaskConnector });
        } else {
            alert("MetaMask is not installed. Please install MetaMask to continue.");
        }
    };

    return (
        <div className="bg-black min-h-screen relative">
            {/* Background Image - Covers entire page including navbar */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 opacity-20">
                    <div
                        className="w-full h-full bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage: `url("/background.svg")`
                        }}></div>
                </div>
            </div>

            {/* Header */}
            <header className="relative z-50 pt-8 left-0 right-0 bg-transparent">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center space-x-2">
                            <img src="/logo.svg" alt="Logo" className="w-16 h-16" />
                            <span className="text-white font-bold text-4xl italic uppercase">onlystables</span>
                        </div>

                        {/* Contact Button */}
                        <button
                            onClick={connectMetaMask}
                            className="border border-[#ff6b35] rounded-full px-6 py-2 text-[#ff6b35] font-medium text-base hover:bg-black hover:text-[#ff6b35] transition-colors">
                            SWAP STABLECOINS
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section with Statistics */}
            <section className="relative pt-32 pb-16 min-h-screen z-10">
                <div className="mt-16 sm:mt-24 lg:mt-32 relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Main Title */}
                    <div className="text-left mb-8 sm:mb-12 lg:mb-16">
                        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-9xl 2xl:text-9xl font-bold text-white mb-4 sm:mb-6 lg:mb-8 leading-none">
                            <div className="uppercase">SWAP STABLECOINS</div>
                            <div className="uppercase">
                                ACROSS <span className="text-[#ff6b35]">CHAINS</span>.
                            </div>
                        </h2>
                    </div>
                </div>
            </section>

            {/* Main Content Block */}
            <section className="py-8 sm:py-12 lg:py-16 bg-black">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-[#ff6b35] rounded-2xl sm:rounded-3xl lg:rounded-4xl p-4 sm:p-6 md:p-8 lg:p-12 xl:p-16 relative">
                        {/* Arrow Image */}
                        <div className="absolute top-4 sm:top-6 lg:top-8 right-4 sm:right-6 lg:right-8">
                            <img src="/arrow.svg" alt="Arrow" className="w-12 h-12 sm:w-16 sm:h-16 lg:w-18 lg:h-18" />
                        </div>

                        {/* SWAP SMARTER Section */}
                        <div className="mb-8 sm:mb-12 lg:mb-16">
                            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-9xl 2xl:text-8xl font-bold text-gray-900 mb-4 sm:mb-6 lg:mb-8 leading-none">
                                <div>SWAP</div>
                                <div>SMARTER.</div>
                            </h2>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                                {/* Wave Image */}
                                <div className="relative -ml-8 sm:-ml-12 lg:-ml-16 hidden sm:block">
                                    <div className="h-72 sm:h-80 lg:h-96 flex items-start justify-start">
                                        <img src="/wave.svg" alt="Wave illustration" className="h-full w-auto object-contain" />
                                    </div>
                                </div>

                                {/* Text Content */}
                                <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6 lg:mt-8">
                                    <p className="text-gray-900 text-sm sm:text-base lg:text-lg leading-relaxed uppercase">
                                        ONLYSTABLES IS THE FASTEST WAY TO SWAP STABLECOINS FROM ONE CHAIN TO ANOTHER. WHILE OTHER PLATFORMS MAKE YOU
                                        JUMP THROUGH HOOPS WITH MULTIPLE STEPS AND BRIDGES, ONLYSTABLES LETS YOU SWAP YOUR STABLECOINS ACROSS CHAINS
                                        IN ONE SIMPLE TRANSACTION.
                                    </p>

                                    <p className="text-gray-900 text-sm sm:text-base lg:text-lg leading-relaxed uppercase">
                                        BUILT ON NEAR INTENTS, WE FOCUS EXCLUSIVELY ON STABLECOINS, MAKING CROSS-CHAIN SWAPS FASTER, CHEAPER, AND MORE
                                        RELIABLE. MOVE YOUR USDC, USDT, AND OTHER STABLECOINS BETWEEN CHAINS WITHOUT THE COMPLEXITY.
                                    </p>
                                </div>
                            </div>

                            {/* Pill Buttons */}
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4 sm:mt-6">
                                <div className="border border-gray-900 rounded-full px-2 sm:px-3 py-1 sm:py-1.5">
                                    <span className="text-gray-900 font-medium text-xs sm:text-sm uppercase">LESSER TIME</span>
                                </div>
                                <div className="border border-gray-900 rounded-full px-2 sm:px-3 py-1 sm:py-1.5">
                                    <span className="text-gray-900 font-medium text-xs sm:text-sm uppercase">LOWER COST</span>
                                </div>
                                <div className="border border-gray-900 rounded-full px-2 sm:px-3 py-1 sm:py-1.5">
                                    <span className="text-gray-900 font-medium text-xs sm:text-sm uppercase">STABLECOINS ONLY</span>
                                </div>
                                {/* Decorative Line */}
                                <div className="ml-2 sm:ml-4 flex-1">
                                    <div className="w-full h-[0.5px] bg-black"></div>
                                </div>
                            </div>
                        </div>

                        {/* SWAP STABLECOINS Section */}
                        <div className="text-center">
                            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-9xl 2xl:text-8xl font-bold text-gray-900 mb-4 sm:mb-6 lg:mb-8 leading-none">
                                SWAP STABLECOINS
                            </h2>
                            <div className="relative -ml-4 sm:-ml-6 md:-ml-8 lg:-ml-12 xl:-ml-16 -mr-4 sm:-mr-6 md:-mr-8 lg:-mr-12 xl:-mr-16 -mt-8 sm:-mt-12 md:-mt-16 lg:-mt-20 xl:-mt-24">
                                <div className="h-48 sm:h-56 md:h-64 lg:h-72 xl:h-80 2xl:h-96 flex items-center justify-end">
                                    <img src="/waveRight.svg" alt="Wave illustration" className="h-full w-auto object-contain" />
                                </div>
                                <button
                                    onClick={connectMetaMask}
                                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border border-gray-900 rounded-full px-4 sm:px-6 py-1.5 sm:py-2 text-gray-900 font-medium text-sm sm:text-base hover:bg-black hover:text-[#ff6b35] transition-colors">
                                    START SWAPPING
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 bg-black">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-white text-sm uppercase">SWAP STABLECOINS ACROSS CHAINS. FAST. SIMPLE. RELIABLE.</p>
                </div>
            </footer>
        </div>
    );
}
