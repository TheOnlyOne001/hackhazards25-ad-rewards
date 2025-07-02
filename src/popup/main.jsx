// src/popup/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Assuming App.jsx is in the same folder
import './index.css'; // CSS file for popup styling

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, injected } from 'wagmi/connectors';
import { OnchainKitProvider } from '@coinbase/onchainkit';

const onchainKitApiKey = process.env.ONCHAINKIT_API_KEY || "KWbUI7zBPikQKbkVhgbiBIjBUvvcwb05"; // Use env var with fallback

const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: 'Hackhazards25 Ad Rewards',
      preference: 'smartWalletOnly',
    }),
    injected({ target: 'metaMask' }),
  ],
  transports: {
    [baseSepolia.id]: http(),
  },
  ssr: false,
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={onchainKitApiKey}
          chain={baseSepolia}
        >
          <App />
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);