import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount
} from '@solana/spl-token';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/api';
import IDL from '../config/solana/platform_treasury_idl.json';

// Solana Configuration
const PROGRAM_ID = new PublicKey('558HkyiK5Ki8gh7aQBzBmRvimrrR9ZuRJgvzni4uZGRg');

// Token Mints (DEVNET)
const USDT_MINT = new PublicKey('DAwBSXe6w9g37wdE2tCrFbho3QHKZi4PjuBytQCULap2');
// const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const USDC_MINT = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');

const Wallet = () => {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [selectedToken, setSelectedToken] = useState('USDT');
  const [fundAmount, setFundAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [funding, setFunding] = useState(false);
  const [program, setProgram] = useState(null);
  const [treasuryPda, setTreasuryPda] = useState(null);
  
  const [balances, setBalances] = useState({
    USDT: { balance: 0, totalFunded: 0, totalSpent: 0, available: 0 },
    USDC: { balance: 0, totalFunded: 0, totalSpent: 0, available: 0 }
  });
  const [fundingHistory, setFundingHistory] = useState([]);

  const walletAddress = wallet.publicKey?.toBase58();
  const isConnected = wallet.connected;

  // Initialize Anchor program
  useEffect(() => {
    if (wallet.publicKey && connection) {
      const provider = new AnchorProvider(
        connection,
        wallet,
        { commitment: 'confirmed' }
      );
      
      const program = new Program(IDL, PROGRAM_ID, provider);
      setProgram(program);
      
      // Find treasury PDA
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('treasury')],
        PROGRAM_ID
      );
      setTreasuryPda(pda);
    }
  }, [wallet.publicKey, connection, wallet]);

  const authHeaders = () => {
    const token = localStorage.getItem('userToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch wallet balances from backend
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

  // Fetch funding history from backend
  const fetchFundingHistory = async () => {
    if (!walletAddress || !isConnected) return;

    try {
      const response = await axios.get(
        API_ENDPOINTS.WALLET_FUNDINGS_BY_USER(walletAddress),
        { headers: authHeaders() }
      );

      if (response.data.success) {
        setFundingHistory(response.data.data.slice(0, 10));
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

  // Handle fund wallet - calls Solana deposit function
  const handleFundWallet = async () => {
    if (!isConnected || !wallet.publicKey || !program || !treasuryPda) {
      toast.error('Please connect your Phantom or Solflare wallet');
      return;
    }

    if (!fundAmount || parseFloat(fundAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setFunding(true);

    try {
      const mint = selectedToken === 'USDT' ? USDT_MINT : USDC_MINT;
      const amount = new BN(parseFloat(fundAmount) * 1_000_000); // 6 decimals

      const userTokenAccount = await getAssociatedTokenAddress(mint, wallet.publicKey);
      const treasuryTokenAccount = await getAssociatedTokenAddress(mint, treasuryPda, true);

      // Check if treasury token account exists, if not create it
      const preInstructions = [];
      try {
        await getAccount(connection, treasuryTokenAccount);
      } catch {
        preInstructions.push(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            treasuryTokenAccount,
            treasuryPda,
            mint
          )
        );
      }

      console.log('🔄 Calling deposit function with:', {
        amount: fundAmount,
        mint: mint.toBase58(),
        user: wallet.publicKey.toBase58(),
        treasury: treasuryPda.toBase58()
      });

      // Call the deposit function
      const tx = await program.methods
        .deposit(amount)
        .accounts({
          treasury: treasuryPda,
          user: wallet.publicKey,
          userTokenAccount,
          treasuryTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .preInstructions(preInstructions)
        .rpc();

      console.log('✅ Deposit transaction:', tx);
      toast.success('Processing deposit...');

      // Wait for confirmation
      await connection.confirmTransaction(tx, 'confirmed');

      // Get transaction details
      const txDetails = await connection.getTransaction(tx, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      console.log('📋 Transaction details:', txDetails);

      // Prepare funding data for backend
      const fundingData = {
        user: wallet.publicKey.toBase58(),
        token: mint.toBase58(),
        amount: amount.toString(),
        transactionHash: tx,
        blockNumber: txDetails?.slot?.toString() || '0'
      };

      console.log('📤 Sending to backend:', fundingData);

      // Send to backend
      try {
        const response = await axios.post(
          API_ENDPOINTS.WALLET_FUNDINGS_CREATE,
          fundingData,
          { headers: authHeaders(), timeout: 10000 }
        );

        console.log('✅ Backend response:', response.data);
        toast.success(`Successfully funded ${fundAmount} ${selectedToken}!`);
      } catch (backendError) {
        console.error('❌ Backend error:', backendError);
        const errorMsg = backendError.response?.data?.error ||
          backendError.response?.data?.message ||
          backendError.message ||
          'Unknown error';
        toast.error(`Deposit successful but backend update failed: ${errorMsg}`);
      }

      setFundAmount('');
      await fetchBalances();
      await fetchFundingHistory();

    } catch (error) {
      console.error('❌ Fund wallet error:', error);

      let errorMessage = 'Failed to fund wallet';
      if (error.message) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction was cancelled';
        } else if (error.message.includes('insufficient')) {
          errorMessage = 'Insufficient balance or SOL for gas fees';
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
        <p className="text-gray-600 mb-24">Please connect your Phantom or Solflare wallet</p>
        <p className="text-sm text-gray-500">Click the "Select Wallet" button in the header to get started</p>
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
                Connected (Solana Devnet)
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

            {/* Program Info */}
            <div className="bg-info-50 rounded-12 px-16 py-12 mb-24">
              <p className="text-info-600 text-xs mb-4">
                <i className="ph ph-info me-4" />
                Contract Information
              </p>
              <p className="text-xs text-gray-700 mb-2 font-monospace">
                <strong>Program:</strong> {PROGRAM_ID.toBase58()}
              </p>
              <p className="text-xs text-gray-700 mb-0 font-monospace">
                <strong>Network:</strong> Solana Devnet
              </p>
            </div>

            {/* Token Selector */}
            <div className="mb-24">
              <div className="flex-align gap-16 mb-16">
                <button
                  className={`btn ${selectedToken === 'USDT' ? 'btn-main-two' : 'btn-outline-main-two'} py-12 px-24`}
                  onClick={() => setSelectedToken('USDT')}
                >
                  USDT (SPL)
                </button>
                <button
                  className={`btn ${selectedToken === 'USDC' ? 'btn-main-two' : 'btn-outline-main-two'} py-12 px-24`}
                  onClick={() => setSelectedToken('USDC')}
                >
                  USDC (SPL)
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
                        href={`https://explorer.solana.com/tx/${funding.transactionHash}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-main-two-600 text-sm flex-align gap-4 hover-text-decoration-underline"
                      >
                        View on Solana Explorer
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
                <h6 className="text-sm fw-semibold mb-4 text-warning-900">Solana Devnet</h6>
                <p className="text-xs text-warning-700 mb-0">
                  You are connected to Solana Devnet. Get free devnet SOL and test tokens from faucets.
                  Make sure you have enough SOL for transaction fees.
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