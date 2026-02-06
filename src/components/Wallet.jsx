import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/api';

const { REACT_APP_CONTRACT_ADDRESS, REACT_APP_USDT_ADDRESS, REACT_APP_USDC_ADDRESS } = process.env;

const Wallet = () => {
  const [tronWeb, setTronWeb] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedToken, setSelectedToken] = useState('USDT');
  const [fundAmount, setFundAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [funding, setFunding] = useState(false);
  const [balances, setBalances] = useState({
    USDT: { balance: 0, totalFunded: 0, totalSpent: 0, available: 0 },
    USDC: { balance: 0, totalFunded: 0, totalSpent: 0, available: 0 }
  });
  const [fundingHistory, setFundingHistory] = useState([]);

  const authHeaders = () => {
    const token = localStorage.getItem('userToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Listen for wallet connection events from HeaderOne
  useEffect(() => {
    const handleWalletConnected = (event) => {
      const { address, tronWeb } = event.detail;
      setWalletAddress(address);
      setTronWeb(tronWeb);
      setIsConnected(true);
    };

    const handleWalletDisconnected = () => {
      setWalletAddress(null);
      setTronWeb(null);
      setIsConnected(false);
    };

    window.addEventListener('tronWalletConnected', handleWalletConnected);
    window.addEventListener('tronWalletDisconnected', handleWalletDisconnected);

    return () => {
      window.removeEventListener('tronWalletConnected', handleWalletConnected);
      window.removeEventListener('tronWalletDisconnected', handleWalletDisconnected);
    };
  }, []);

  // Check for existing TronLink connection on mount
  useEffect(() => {
    const checkExistingConnection = () => {
      const savedAddress = localStorage.getItem('tronWalletAddress');

      if (savedAddress && window.tronWeb && window.tronWeb.ready) {
        const currentAddress = window.tronWeb.defaultAddress.base58;

        if (currentAddress === savedAddress) {
          setTronWeb(window.tronWeb);
          setWalletAddress(currentAddress);
          setIsConnected(true);
        }
      }
    };

    // Wait for TronLink to inject
    const timer = setTimeout(checkExistingConnection, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Fetch wallet balances
  const fetchBalances = async () => {
    if (!walletAddress || !isConnected) return;

    try {
      const [usdtBalance, usdcBalance] = await Promise.all([
        axios.get(API_ENDPOINTS.WALLET_BALANCE(walletAddress, 'USDT'), {
          headers: authHeaders()
        }).catch(() => ({ data: { success: false, data: {} } })),
        axios.get(API_ENDPOINTS.WALLET_BALANCE(walletAddress, 'USDC'), {
          headers: authHeaders()
        }).catch(() => ({ data: { success: false, data: {} } }))
      ]);

      setBalances({
        USDT: {
          balance: parseFloat(usdtBalance.data?.data?.availableBalance || usdtBalance.data?.data?.balance || 0),
          totalFunded: usdtBalance.data?.data?.totalFunded || 0,
          totalSpent: usdtBalance.data?.data?.totalSpent || 0,
          available: parseFloat(usdtBalance.data?.data?.availableBalance || usdtBalance.data?.data?.balance || 0)
        },
        USDC: {
          balance: parseFloat(usdcBalance.data?.data?.availableBalance || usdcBalance.data?.data?.balance || 0),
          totalFunded: usdcBalance.data?.data?.totalFunded || 0,
          totalSpent: usdcBalance.data?.data?.totalSpent || 0,
          available: parseFloat(usdcBalance.data?.data?.availableBalance || usdcBalance.data?.data?.balance || 0)
        }
      });
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  // Fetch funding history
  const fetchFundingHistory = async () => {
    if (!walletAddress || !isConnected) return;

    try {
      const response = await axios.get(
        API_ENDPOINTS.WALLET_FUNDINGS_BY_USER(walletAddress),
        { headers: authHeaders() }
      );

      if (response.data.success) {
        setFundingHistory(response.data.data.slice(0, 10)); // Last 10 fundings
      }
    } catch (error) {
      console.error('Error fetching funding history:', error);
    }
  };

  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchBalances();
      fetchFundingHistory();
    }
  }, [walletAddress, isConnected]);

  // Handle fund wallet
  const handleFundWallet = async () => {
    if (!isConnected || !walletAddress || !tronWeb) {
      toast.error('Please connect your TronLink wallet');
      return;
    }

    if (!fundAmount || parseFloat(fundAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setFunding(true);

    try {
      // Ensure we're using the TRON addresses from env
      const tokenAddress = selectedToken === 'USDT'
        ? REACT_APP_USDT_ADDRESS
        : REACT_APP_USDC_ADDRESS;

      const contractAddress = REACT_APP_CONTRACT_ADDRESS;

      console.log('🔍 Environment Variables Check:', {
        contractAddress,
        tokenAddress,
        selectedToken
      });

      // Validate addresses are in TRON format (start with T)
      if (!contractAddress || !contractAddress.startsWith('T')) {
        toast.error('Invalid contract address in environment variables');
        console.error('❌ Contract address must start with T, got:', contractAddress);
        setFunding(false);
        return;
      }

      if (!tokenAddress || !tokenAddress.startsWith('T')) {
        toast.error('Invalid token address in environment variables');
        console.error('❌ Token address must start with T, got:', tokenAddress);
        setFunding(false);
        return;
      }

      // Convert amount to SUN (TRX uses 6 decimals for USDT/USDC on TRON)
      const decimals = 6;
      const amountInSun = Math.floor(parseFloat(fundAmount) * Math.pow(10, decimals));

      console.log('🔄 Funding wallet with:', {
        token: selectedToken,
        amount: fundAmount,
        amountInSun: amountInSun,
        tokenAddress: tokenAddress,
        contractAddress: contractAddress,
        walletAddress: walletAddress
      });

      // Get token contract instance using base58 address
      let tokenContract;
      try {
        tokenContract = await tronWeb.contract().at(tokenAddress);
        console.log('✅ Token contract loaded successfully');
      } catch (err) {
        console.error('❌ Failed to load token contract:', err);
        toast.error('Failed to load token contract. Please check the token address.');
        setFunding(false);
        return;
      }

      // Check user's token balance
      let userBalance;
      try {
        userBalance = await tokenContract.balanceOf(walletAddress).call();
        const userBalanceNumber = parseInt(userBalance.toString());

        console.log('💰 User balance:', {
          raw: userBalance.toString(),
          formatted: userBalanceNumber / Math.pow(10, decimals),
          required: fundAmount
        });

        if (userBalanceNumber < amountInSun) {
          toast.error(`Insufficient ${selectedToken} balance. You have ${(userBalanceNumber / Math.pow(10, decimals)).toFixed(2)} ${selectedToken}`);
          setFunding(false);
          return;
        }
      } catch (err) {
        console.error('❌ Failed to check balance:', err);
        toast.error('Failed to check your token balance');
        setFunding(false);
        return;
      }

      // Approve token spending
      console.log('✅ Approving token spending...');
      try {
        const approveTx = await tokenContract.approve(
          contractAddress,
          amountInSun
        ).send({
          feeLimit: 100000000, // 100 TRX
          callValue: 0,
          shouldPollResponse: true
        });

        console.log('✅ Approval transaction:', approveTx);
        toast.success('Token approval successful! Please confirm the funding transaction...');
      } catch (err) {
        console.error('❌ Approval failed:', err);
        if (err.message && err.message.includes('Confirmation declined')) {
          toast.error('Transaction was cancelled');
        } else {
          toast.error('Token approval failed: ' + (err.message || 'Unknown error'));
        }
        setFunding(false);
        return;
      }

      // Wait a moment for the approval to be confirmed
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get main contract instance
      let mainContract;
      try {
        mainContract = await tronWeb.contract().at(contractAddress);
        console.log('✅ Main contract loaded successfully');
      } catch (err) {
        console.error('❌ Failed to load main contract:', err);
        toast.error('Failed to load payment contract. Please check the contract address.');
        setFunding(false);
        return;
      }

      // Call fundWallet function
      console.log('💸 Calling fundWallet with params:', {
        tokenAddress,
        amountInSun
      });

      let fundTx;
      try {
        fundTx = await mainContract.fundWallet(
          tokenAddress,
          amountInSun
        ).send({
          feeLimit: 100000000, // 100 TRX
          callValue: 0,
          // shouldPollResponse: true
        });

        console.log('📋 Fund transaction hash:', fundTx);




      } catch (err) {
        console.error('❌ fundWallet call failed:', err);
        if (err.message && err.message.includes('Confirmation declined')) {
          toast.error('Transaction was cancelled');
        } else if (err.message && err.message.includes('Invalid contract address')) {
          toast.error('Invalid contract address provided. Please check your environment variables.');
        } else {
          toast.error('Funding transaction failed: ' + (err.message || 'Unknown error'));
        }
        setFunding(false);
        return;
      }

      // let txHash = null;

      // if (typeof fundTx === 'string') {
      //   txHash = fundTx;
      // } else if (fundTx?.txid) {
      //   txHash = fundTx.txid;
      // } else if (fundTx?.transaction?.txID) {
      //   txHash = fundTx.transaction.txID;
      // } else {
      //   console.error('❌ Invalid fundTx returned:', fundTx);
      //   toast.error('Failed to get transaction hash from TronLink');
      //   setFunding(false);
      //   return;
      // }

      // console.log('✅ Normalized txHash:', txHash);

      let txHash = null;

      // 1️⃣ Direct string
      if (typeof fundTx === 'string') {
        txHash = fundTx;
      }

      // 2️⃣ Object txid
      else if (fundTx && typeof fundTx === 'object') {
        txHash =
          fundTx.txid ||
          fundTx.transaction?.txID ||
          fundTx.receipt?.txID ||
          fundTx.receipt?.transaction_id;
      }

      // 3️⃣ FINAL fallback — read last transaction from wallet
      if (!txHash) {
        console.warn('⚠️ fundTx empty — fetching latest transaction from chain');

        const txs = await tronWeb.trx.getTransactionsRelated(
          walletAddress,
          'from',
          1,
          0
        );

        if (txs && txs.length > 0) {
          txHash = txs[0].txID;
        }
      }

      if (!txHash) {
        toast.error('Transaction completed but hash could not be resolved');
        setFunding(false);
        return;
      }

      console.log('✅ Final txHash resolved:', txHash);


      // Get transaction info to extract events
      let txInfo;
      try {
        // Wait a bit for transaction to be confirmed
        await new Promise(resolve => setTimeout(resolve, 3000));
        txInfo = await tronWeb.trx.getTransactionInfo(txHash);
        console.log('📋 Transaction info:', txInfo);
      } catch (err) {
        console.error('❌ Failed to get transaction info:', err);
        // Continue anyway, we have the transaction hash
        txInfo = { blockNumber: 0, log: [] };
      }

      // Parse WalletFunded event from logs
      let walletFundedEvent = null;

      if (txInfo.log && txInfo.log.length > 0) {
        // Look for WalletFunded event
        // Event signature: WalletFunded(address indexed user, address indexed token, uint256 amount)
        try {
          const walletFundedSignature = tronWeb.sha3('WalletFunded(address,address,uint256)').slice(0, 10);

          for (const log of txInfo.log) {
            if (log.topics && log.topics[0] === walletFundedSignature) {
              walletFundedEvent = {
                user: tronWeb.address.fromHex('41' + log.topics[1].slice(24)),
                token: tronWeb.address.fromHex('41' + log.topics[2].slice(24)),
                amount: parseInt(log.data, 16).toString()
              };
              break;
            }
          }
        } catch (err) {
          console.warn('⚠️ Failed to parse event logs:', err);
        }
      }

      console.log('💰 WalletFunded event found:', !!walletFundedEvent);

      // Prepare funding data - use event if found, otherwise use fallback
      let fundingData = null;

      if (walletFundedEvent) {
        fundingData = {
          user: walletFundedEvent.user,
          token: walletFundedEvent.token,
          amount: walletFundedEvent.amount,
          transactionHash: txHash,
          blockNumber: txInfo.blockNumber ? txInfo.blockNumber.toString() : '0'
        };
        console.log('📤 Using event data:', fundingData);
      } else {
        // Fallback: Use transaction data we know
        console.warn('⚠️ WalletFunded event not found, using fallback');

        fundingData = {
          user: walletAddress,
          token: tokenAddress,
          amount: amountInSun.toString(),
          transactionHash: txHash,
          blockNumber: txInfo.blockNumber ? txInfo.blockNumber.toString() : '0'
        };
        console.log('📤 Using fallback data:', fundingData);
      }

      // Send to backend
      if (fundingData) {
        const authToken = localStorage.getItem('userToken');
        console.log('🔑 Auth token exists:', !!authToken);
        console.log('🚀 About to call API:', API_ENDPOINTS.WALLET_FUNDINGS_CREATE);
        console.log('📦 Request payload:', JSON.stringify(fundingData, null, 2));

        if (!txHash || typeof txHash !== 'string') {
          toast.error('Invalid transaction hash. Funding aborted.');
          return;
        }

        try {
          const response = await axios.post(
            API_ENDPOINTS.WALLET_FUNDINGS_CREATE,
            fundingData,
            {
              headers: authHeaders(),
              timeout: 10000 // 10 second timeout
            }
          );

          console.log('✅ Wallet funding recorded in backend:', response.data);
          toast.success('Wallet funding recorded successfully!');
        } catch (backendError) {
          console.error('❌ FAILED to record funding in backend');
          console.error('Error object:', backendError);
          console.error('Error response:', backendError.response?.data);
          console.error('Error status:', backendError.response?.status);

          const errorMsg = backendError.response?.data?.error ||
            backendError.response?.data?.message ||
            backendError.message ||
            'Unknown error';
          toast.error(`Failed to update balance: ${errorMsg}`);
        }
      } else {
        console.error('❌ No funding data available - cannot call API');
        toast.error('Could not extract funding data. Please refresh the page.');
      }

      toast.success(`Successfully funded ${fundAmount} ${selectedToken} to your wallet!`);
      setFundAmount('');

      // Refresh balances immediately
      await fetchBalances();
      await fetchFundingHistory();

    } catch (error) {
      console.error('Fund wallet error:', error);

      let errorMessage = 'Failed to fund wallet';

      if (error.message) {
        if (error.message.includes('Confirmation declined by user')) {
          errorMessage = 'Transaction was cancelled';
        } else if (error.message.includes('bandwidth')) {
          errorMessage = 'Insufficient bandwidth. Please try again later.';
        } else if (error.message.includes('energy')) {
          errorMessage = 'Insufficient energy. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage);
    } finally {
      setFunding(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="border border-gray-100 rounded-16 px-24 py-40 text-center">
        <i className="ph ph-wallet text-6xl text-gray-400 mb-16" />
        <p className="text-gray-600 mb-24">Please connect your TronLink wallet to view your wallet balance</p>
        <p className="text-sm text-gray-500">Click the "Connect Wallet" button in the header to get started</p>
      </div>
    );
  }

  const currentBalance = balances[selectedToken];

  return (
    <div className="wallet-section">
      <div className="row">
        {/* Wallet Balance Card */}
        <div className="col-lg-6 mb-24">
          <div className="border border-gray-100 rounded-16 px-24 py-40 h-100">
            <div className="flex-align justify-content-between mb-32">
              <h5 className="text-xl mb-0">Platform Wallet</h5>
              <div className="bg-success-50 text-success-600 px-12 py-6 rounded-8 text-sm fw-medium">
                <i className="ph ph-check-circle me-4" />
                Connected (Nile Testnet)
              </div>
            </div>

            {/* Wallet Address */}
            <div className="bg-neutral-50 rounded-12 px-16 py-12 mb-24">
              <p className="text-gray-600 text-xs mb-4">Wallet Address</p>
              <div className="flex-align justify-content-between">
                <p className="text-sm fw-medium text-gray-900 mb-0 font-monospace">
                  {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : ''}
                </p>
                <button
                  className="btn btn-sm btn-outline-main-two py-4 px-8"
                  onClick={() => {
                    navigator.clipboard.writeText(walletAddress);
                    toast.success('Address copied!');
                  }}
                >
                  <i className="ph ph-copy" />
                </button>
              </div>
            </div>

            {/* Environment Info */}
            <div className="bg-info-50 rounded-12 px-16 py-12 mb-24">
              <p className="text-info-600 text-xs mb-4">
                <i className="ph ph-info me-4" />
                Contract Addresses
              </p>
              <p className="text-xs text-gray-700 mb-2 font-monospace">
                <strong>Contract:</strong> {REACT_APP_CONTRACT_ADDRESS}
              </p>
              <p className="text-xs text-gray-700 mb-0 font-monospace">
                <strong>USDT:</strong> {REACT_APP_USDT_ADDRESS}
              </p>
            </div>

            {/* Token Selector */}
            <div className="mb-24">
              <div className="flex-align gap-16 mb-16">
                <button
                  className={`btn ${selectedToken === 'USDT' ? 'btn-main-two' : 'btn-outline-main-two'} py-12 px-24`}
                  onClick={() => setSelectedToken('USDT')}
                >
                  USDT (TRC20)
                </button>
                <button
                  className={`btn ${selectedToken === 'USDC' ? 'btn-main-two' : 'btn-outline-main-two'} py-12 px-24`}
                  onClick={() => setSelectedToken('USDC')}
                >
                  USDC (TRC20)
                </button>
              </div>
            </div>

            {/* Balance Display */}
            <div className="mb-32">
              <div className="mb-16">
                <p className="text-gray-600 text-sm mb-8">Available Balance</p>
                <h3 className="text-2xl fw-bold text-main-two-600">
                  {currentBalance.available.toString()} {selectedToken}
                </h3>
              </div>

              <div className="border-top pt-16 mt-16">
                <div className="row">
                  <div className="col-6">
                    <p className="text-gray-600 text-sm mb-4">Total Funded</p>
                    <p className="text-lg fw-semibold">{currentBalance.totalFunded.toString()}</p>
                  </div>
                  <div className="col-6">
                    <p className="text-gray-600 text-sm mb-4">Total Spent</p>
                    <p className="text-lg fw-semibold">{currentBalance.totalSpent.toString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Fund Wallet Form */}
            <div className="border-top pt-24">
              <h6 className="text-lg mb-16">Add Funds</h6>
              <div className="mb-16">
                <input
                  type="number"
                  className="common-input"
                  placeholder={`Enter amount in ${selectedToken}`}
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <button
                className="btn btn-main-two w-100 py-18"
                onClick={handleFundWallet}
                disabled={funding || !fundAmount}
              >
                {funding ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-8" role="status" aria-hidden="true"></span>
                    Funding...
                  </>
                ) : (
                  `Fund ${selectedToken} Wallet`
                )}
              </button>
              <p className="text-xs text-gray-500 mt-12 text-center">
                <i className="ph ph-info me-4" />
                Funds will be added to your platform wallet balance
              </p>
            </div>
          </div>
        </div>

        {/* Funding History */}
        <div className="col-lg-6 mb-24">
          <div className="border border-gray-100 rounded-16 px-24 py-40 h-100">
            <h5 className="text-xl mb-32">Recent Funding History</h5>

            {fundingHistory.length === 0 ? (
              <div className="text-center py-40">
                <i className="ph ph-clock-counter-clockwise text-6xl text-gray-400 mb-16" />
                <p className="text-gray-600">No funding history yet</p>
                <p className="text-sm text-gray-500">Your funding transactions will appear here</p>
              </div>
            ) : (
              <div className="funding-history">
                {fundingHistory.map((funding, index) => (
                  <div key={index} className="border border-gray-100 rounded-12 p-16 mb-16">
                    <div className="flex-align justify-content-between mb-12">
                      <div>
                        <span className="fw-semibold text-lg">{funding.amountFormatted} {funding.tokenSymbol}</span>
                        <p className="text-sm text-gray-600 mb-0">
                          {new Date(funding.trackedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="bg-success-50 text-success-600 px-12 py-6 rounded-8 text-sm fw-medium">
                        <i className="ph ph-check-circle me-4" />
                        Success
                      </div>
                    </div>
                    <div className="border-top pt-12">
                      <a
                        href={`https://nile.tronscan.org/#/transaction/${funding.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-main-two-600 text-sm flex-align gap-4 hover-text-decoration-underline"
                      >
                        View on TronScan (Nile)
                        <i className="ph ph-arrow-square-out" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Network Information */}
      <div className="row">
        <div className="col-12">
          <div className="border border-warning-100 rounded-16 px-24 py-24 bg-warning-50">
            <div className="flex-align gap-12">
              <i className="ph ph-warning text-2xl text-warning-600" />
              <div>
                <h6 className="text-sm fw-semibold mb-4 text-warning-900">TRON Nile Testnet</h6>
                <p className="text-xs text-warning-700 mb-0">
                  You are connected to TRON Nile Testnet. Get free testnet TRX and USDT from faucets.
                  Make sure you have enough TRX for transaction fees (energy/bandwidth).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;