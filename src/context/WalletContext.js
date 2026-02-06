import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import EthereumProvider from '@walletconnect/ethereum-provider';
import ecommercePaymentAbi from '../abi/ecommercePaymentAbi.json';

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [address, setAddress] = useState(null);
  const [walletType, setWalletType] = useState(null);
  const [wcProvider, setWcProvider] = useState(null);

  // const BSC_MAINNET_CONFIG = {
  //   chainId: '0x38',  // 56 in hex
  //   chainName: 'BNB Smart Chain',
  //   nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  //   rpcUrls: [
  //     'https://bsc-dataseed.binance.org/',
  //     'https://bsc-dataseed1.binance.org/',
  //     'https://bsc-dataseed1.ninicoin.io/',
  //     'https://bsc-dataseed2.binance.org/',
  //   ],
  //   blockExplorerUrls: ['https://bscscan.com'],
  // };

  // const POLYGON_AMOY_CONFIG = {
  //   chainId: '0x13882', // 80002
  //   chainName: 'Polygon Amoy Testnet',
  //   nativeCurrency: {
  //     name: 'MATIC',
  //     symbol: 'MATIC',
  //     decimals: 18,
  //   },
  //   rpcUrls: [
  //     'https://rpc-amoy.polygon.technology',
  //   ],
  //   blockExplorerUrls: ['https://amoy.polygonscan.com'],
  // };

  const POLYGON_MAINNET_CONFIG = {
    chainId: '0x89', // 137
    chainName: 'Polygon Mainnet',
    nativeCurrency: {
      name: 'POL',
      symbol: 'POL',
      decimals: 18,
    },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
  };

  const switchToPolygonMainnet = async (ethereum) => {
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: POLYGON_MAINNET_CONFIG.chainId }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [POLYGON_MAINNET_CONFIG],
      });
    } else {
      throw err;
    }
  }
};



  const setupContract = async (prov, sig) => {
    const cont = new ethers.Contract(
      process.env.REACT_APP_CONTRACT_ADDRESS,   // ← make sure this points to your MAINNET contract
      ecommercePaymentAbi,
      sig
    );
    console.log("Contract initialized:", cont);

    const add = await sig.getAddress();
    setAddress(add);
    setProvider(prov);
    setSigner(sig);
    setContract(cont);

    return { address: add, provider: prov, signer: sig, contract: cont };
  };

  const connectMetaMask = async () => {
    console.log("Connecting to MetaMask...");
    if (!window.ethereum) {
      throw new Error('Please install MetaMask');
    }

    try {
      await switchToPolygonMainnet(window.ethereum);
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const prov = new ethers.BrowserProvider(window.ethereum);
      const sig = await prov.getSigner();

      await setupContract(prov, sig);
      setWalletType('metamask');

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return true;
    } catch (err) {
      console.error("MetaMask Connection Error:", err);
      throw err;
    }
  };

  const connectWalletConnect = async (isNewConnection = true) => {
    console.log(`[WC] Starting connect (new=${isNewConnection}, showQr=${isNewConnection})`);

    try {
      if (!process.env.REACT_APP_WALLETCONNECT_PROJECT_ID) {
        throw new Error('Missing REACT_APP_WALLETCONNECT_PROJECT_ID in .env');
      }

      const walletConnectProvider = await EthereumProvider.init({
        projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID,
        // chains: [56],   // ← changed to mainnet
        // chains: [80002],
        chains: [137],
        showQrModal: isNewConnection,
        qrModalOptions: { themeMode: 'light' },
        metadata: {
          name: 'Ecommerce DApp',
          description: 'Decentralized Ecommerce Platform',
          url: window.location.origin,
          icons: [`${window.location.origin}/assets/images/logo/logo.png`]
        },
        rpcMap: {
          // 56: 'https://bsc-dataseed.binance.org/',   // ← mainnet RPC
          // 80002: 'https://rpc-amoy.polygon.technology',
          137: 'https://polygon-rpc.com',
        }
      });

      if (!walletConnectProvider) {
        throw new Error('Provider init returned null/undefined');
      }

      if (isNewConnection) {
        console.log("[WC] New connection: calling enable()...");
        await walletConnectProvider.enable();

        await new Promise(r => setTimeout(r, 500));

        if (!walletConnectProvider.accounts?.length) {
          if (walletConnectProvider.session?.namespaces?.eip155?.accounts) {
            const sessionAccounts = walletConnectProvider.session.namespaces.eip155.accounts;
            const addresses = sessionAccounts.map(acc => acc.split(':')[2]);
            if (addresses.length > 0) {
              walletConnectProvider.accounts = addresses;
            }
          }
        }

        let attempts = 0;
        while (!walletConnectProvider.accounts?.length && attempts < 10) {
          await new Promise(r => setTimeout(r, 300));
          attempts++;
        }
      } else {
        // Restore logic
        let attempts = 0;
        while (!walletConnectProvider.session && attempts < 10) {
          await new Promise(r => setTimeout(r, 250));
          attempts++;
        }

        if (walletConnectProvider.session?.namespaces?.eip155?.accounts) {
          const sessionAccounts = walletConnectProvider.session.namespaces.eip155.accounts;
          const addresses = sessionAccounts.map(acc => acc.split(':')[2]);
          if (addresses.length > 0 && !walletConnectProvider.accounts?.length) {
            walletConnectProvider.accounts = addresses;
          }
        }

        if (!walletConnectProvider.accounts?.length) {
          throw new Error("No active WalletConnect session found after restore");
        }
      }

      if (!walletConnectProvider.accounts?.length) {
        throw new Error("No accounts available after connection/restore");
      }

      const prov = new ethers.BrowserProvider(walletConnectProvider);
      const sig = await prov.getSigner();

      await setupContract(prov, sig);
      setWalletType('walletconnect');
      setWcProvider(walletConnectProvider);

      walletConnectProvider.on('accountsChanged', handleAccountsChanged);
      walletConnectProvider.on('chainChanged', (chainId) => {
        console.log('[WC] Chain changed to:', chainId);
      });
      walletConnectProvider.on('disconnect', handleDisconnect);

      return true;
    } catch (err) {
      console.error("[WC] Connection failed:", err.message || err);
      throw err;
    }
  };

  const connectWallet = async (type = 'metamask') => {
    try {
      if (type === 'walletconnect') {
        return await connectWalletConnect(true);
      } else {
        return await connectMetaMask();
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      if (walletType === 'walletconnect' && wcProvider) {
        await wcProvider.disconnect();
      }

      // Clean WC localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('wc@') || key.includes('walletconnect') || key.includes('WALLET_CONNECT')) {
          localStorage.removeItem(key);
        }
      });

      setProvider(null);
      setSigner(null);
      setContract(null);
      setAddress(null);
      setWalletType(null);
      setWcProvider(null);

      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
      if (wcProvider) {
        wcProvider.removeListener('accountsChanged', handleAccountsChanged);
        wcProvider.removeListener('disconnect', handleDisconnect);
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      window.location.reload();
    }
  };

  const handleDisconnect = () => {
    console.log("Wallet disconnected event received");
    disconnectWallet();
  };

  useEffect(() => {
    const autoConnect = async () => {
      // MetaMask
      if (window.ethereum?.selectedAddress) {
        try {
          console.log("Auto-connecting MetaMask...");
          await connectMetaMask();
        } catch (err) {
          console.warn("MetaMask auto-connect failed", err);
        }
      }

      // WalletConnect restore
      try {
        const hasWcSession = Object.keys(localStorage).some(key =>
          key.startsWith('wc@') || key.toLowerCase().includes('walletconnect')
        );

        if (hasWcSession) {
          console.log("Found WC session → attempting restore...");
          await connectWalletConnect(false);
        }
      } catch (err) {
        console.warn("WalletConnect auto-restore failed", err);
      }
    };

    autoConnect();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
      if (wcProvider) {
        wcProvider.removeListener('accountsChanged', handleAccountsChanged);
        wcProvider.removeListener('disconnect', handleDisconnect);
      }
    };
  }, []);

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        contract,
        connectWallet,
        disconnectWallet,
        address,
        walletType,
        isConnected: !!address,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);