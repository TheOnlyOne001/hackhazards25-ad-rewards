// src/popup/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Assuming App.jsx is in the same folder
import './index.css'; // Assuming index.css is in src/

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, injected } from 'wagmi/connectors';
import { OnchainKitProvider } from '@coinbase/onchainkit';

const onchainKitApiKey = import.meta.env.VITE_ONCHAINKIT_API_KEY || "YOUR_FALLBACK_ONCHAINKIT_KEY"; // Use env var

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