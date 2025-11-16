import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { bsc } from 'wagmi/chains';

// BNB Chain Mainnet configuration
// Chain ID: 56 (BNB Smart Chain Mainnet)
export const config = createConfig({
  chains: [bsc], // BNB Chain Mainnet (chain ID: 56)
  connectors: [
    injected({
      // Automatically switch to BNB Chain when connecting
      shimDisconnect: true,
    }),
  ],
  transports: {
    [bsc.id]: http('https://bsc-dataseed1.binance.org'), // BNB Chain Mainnet RPC
  },
});

