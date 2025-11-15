import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { bsc } from 'wagmi/chains';

export const config = createConfig({
  chains: [bsc],
  connectors: [
    injected(),
  ],
  transports: {
    [bsc.id]: http(),
  },
});

