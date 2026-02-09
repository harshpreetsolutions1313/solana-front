import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/api';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { 
  PublicKey, 
  Transaction,
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount
} from '@solana/spl-token';

const { 
  REACT_APP_PROGRAM_ID,
  REACT_APP_USDT_MINT, 
  REACT_APP_USDC_MINT,
  REACT_APP_TREASURY_PUBKEY
} = process.env;

const getTokenSymbolByMint = (mint) => {
  if (!mint) return null;
  if (mint === REACT_APP_USDT_MINT) return 'USDT';
  if (mint === REACT_APP_USDC_MINT) return 'USDC';
  return null;
};

const Checkout = () => {
  const navigate = useNavigate();
  const { connection } = useConnection();
  const { publicKey, signTransaction, sendTransaction, connected } = useWallet();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [selectedTokenMint, setSelectedTokenMint] = useState(REACT_APP_USDC_MINT);
  const [paymentMethod, setPaymentMethod] = useState('direct'); // 'direct' or 'wallet'
  const [walletBalance, setWalletBalance] = useState({ USDT: 0, USDC: 0 });

  const walletAddress = publicKey?.toBase58();
  const isConnected = connected && publicKey;

  // Shipping form state
  const [shippingData, setShippingData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    otherMobileNumber: '',
    streetAddress: '',
    city: '',
    state: '',
    country: '',
    zipCode: ''
  });

  const authHeaders = () => {
    const token = localStorage.getItem('userToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Listen for wallet connection events
  useEffect(() => {
    if (isConnected && walletAddress) {
      console.log('Wallet connected:', walletAddress);
    }
  }, [isConnected, walletAddress]);

  // Fetch wallet balance for SPL tokens
  const fetchWalletBalance = async () => {
    if (!walletAddress || !isConnected) return;

    try {
      const tokenSymbol = getTokenSymbolByMint(selectedTokenMint);
      if (!tokenSymbol) {
        toast.error('Unsupported token selected');
        return;
      }

      // Get on-chain balance
      const tokenMintPubkey = new PublicKey(selectedTokenMint);
      const walletPubkey = new PublicKey(walletAddress);
      
      const associatedTokenAddress = await getAssociatedTokenAddress(
        tokenMintPubkey,
        walletPubkey
      );

      try {
        const tokenAccount = await getAccount(connection, associatedTokenAddress);
        // SPL tokens typically use 9 decimals, but check the mint for accuracy
        const balance = Number(tokenAccount.amount) / Math.pow(10, 6);
        
        setWalletBalance(prev => ({
          ...prev,
          [tokenSymbol]: balance
        }));

        console.log(`${tokenSymbol} balance:`, balance);
      } catch (err) {
        // Token account doesn't exist
        console.log('Token account not found for', tokenSymbol);
        setWalletBalance(prev => ({
          ...prev,
          [tokenSymbol]: 0
        }));
      }

      // Also check backend balance (for "Use Wallet" payment method)
      if (paymentMethod === 'wallet') {
        try {
          const response = await axios.get(
            API_ENDPOINTS.WALLET_BALANCE(walletAddress, tokenSymbol),
            { headers: authHeaders() }
          );

          if (response.data.success) {
            const backendBalance = Number(response.data.data.availableBalance || 0);
            setWalletBalance(prev => ({
              ...prev,
              [`${tokenSymbol}_BACKEND`]: backendBalance
            }));
            console.log(`${tokenSymbol} backend balance:`, backendBalance);
          }
        } catch (error) {
          console.log('Backend balance check failed:', error.message);
        }
      }

    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchWalletBalance();
    }
  }, [walletAddress, isConnected, selectedTokenMint, paymentMethod]);

  const normalizeCartItems = (raw = []) => {
    return raw
      .map((cartEntry) => {
        const product = cartEntry.product || {};
        const id = product?.id || cartEntry.productId || '';

        return {
          id,
          name: product?.name?.trim() || 'Product',
          price: Number(product?.price || 0),
          quantity: Number(cartEntry.quantity || 1),
          image:
            (product?.images && product.images.length > 0 && product.images[0]) ||
            '/images/no-image.svg',
        };
      })
      .filter((p) => p.id);
  };

  const fetchCart = async () => {
    if (!localStorage.getItem('userToken')) {
      setItems([]);
      setLoading(false);
      navigate('/cart');
      return;
    }

    setLoading(true);

    try {
      const res = await axios.get(API_ENDPOINTS.CART, {
        headers: authHeaders(),
      });

      const payload = res.data;
      const list = Array.isArray(payload?.cart) ? payload.cart : [];
      const normalizedItems = normalizeCartItems(list);

      if (normalizedItems.length === 0) {
        toast.error('Your cart is empty');
        navigate('/cart');
        return;
      }

      setItems(normalizedItems);
    } catch (err) {
      console.error('Cart fetch failed', err);
      toast.error('Failed to load cart');
      navigate('/cart');
    } finally {
      setLoading(false);
    }
  };

  const fetchShippingInfo = async () => {
    try {
      const res = await axios.get('https://solana-backend-hazel.vercel.app/api/shipping/me', {
        headers: authHeaders(),
      });

      if (res.data?.data) {
        setShippingData({
          firstName: res.data?.data.firstName || '',
          lastName: res.data?.data.lastName || '',
          email: res.data?.data.email || '',
          mobileNumber: res.data?.data.mobileNumber || '',
          otherMobileNumber: res.data?.data.otherMobileNumber || '',
          streetAddress: res.data?.data.streetAddress || '',
          city: res.data?.data.city || '',
          state: res.data?.data.state || '',
          country: res.data?.data.country || '',
          zipCode: res.data?.data.zipCode || ''
        });
      }
    } catch (err) {
      console.log('No existing shipping info found');
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('selectedPaymentToken');
    if (savedToken) {
      setSelectedTokenMint(savedToken);
    }

    fetchCart();
    fetchShippingInfo();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateShippingForm = () => {
    const required = ['firstName', 'lastName', 'email', 'mobileNumber', 'streetAddress', 'city', 'state', 'country', 'zipCode'];

    for (let field of required) {
      if (!shippingData[field]?.trim()) {
        toast.error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shippingData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const saveOrUpdateShipping = async () => {
    try {
      await axios.put('https://solana-backend-hazel.vercel.app/api/shipping', shippingData, {
        headers: authHeaders(),
      });
      return true;
    } catch (err) {
      try {
        await axios.post('https://solana-backend-hazel.vercel.app/api/shipping', shippingData, {
          headers: authHeaders(),
        });
        return true;
      } catch (createErr) {
        console.error('Failed to save shipping info', createErr);
        toast.error('Failed to save shipping information');
        return false;
      }
    }
  };

  const handleRemoveFromCart = async (productId) => {
    try {
      await axios.delete(API_ENDPOINTS.CART, {
        headers: authHeaders(),
        data: { productId },
      });
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      console.error('Remove from cart failed', err);
    }
  };

  // Handle wallet payment (using backend-tracked balance)
  const handleWalletPayment = async () => {
    if (!isConnected || !walletAddress) {
      toast.error('Please connect your Phantom wallet');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!validateShippingForm()) {
      return;
    }

    const tokenSymbol = getTokenSymbolByMint(selectedTokenMint);
    if (!tokenSymbol) {
      toast.error('Unsupported token selected');
      return;
    }
    
    const totalAmount = subtotal;
    const backendBalance = walletBalance[`${tokenSymbol}_BACKEND`] || 0;

    if (backendBalance < totalAmount) {
      toast.error(`Insufficient wallet balance. Available: ${backendBalance.toFixed(2)} ${tokenSymbol}, Required: ${totalAmount.toFixed(2)} ${tokenSymbol}`);
      return;
    }

    setPlacingOrder(true);

    try {
      const shippingSaved = await saveOrUpdateShipping();
      if (!shippingSaved) {
        setPlacingOrder(false);
        return;
      }

      const orderItems = items.map((item) => ({
        id: item.id,
        quantity: item.quantity
      }));

      const response = await axios.post(
        API_ENDPOINTS.WALLET_PAY,
        {
          items: orderItems,
          token: tokenSymbol,
          buyer: walletAddress,
        },
        { headers: authHeaders() }
      );

      if (response.data.success) {
        toast.success('Order placed successfully using wallet balance!');

        for (const item of items) {
          await handleRemoveFromCart(item.id);
        }

        fetchWalletBalance();

        setTimeout(() => {
          navigate('/purchased-products');
        }, 2000);
      }

    } catch (err) {
      console.error('Wallet payment failed', err);
      toast.error(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to process wallet payment'
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  // Wait for transaction confirmation on Solana
  const waitForTransactionConfirmation = async (signature, maxAttempts = 30) => {
    console.log(`🔍 Waiting for transaction confirmation: ${signature}`);
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const status = await connection.getSignatureStatus(signature);
        
        console.log(`📋 Transaction status (Attempt ${i + 1}/${maxAttempts}):`, status);
        
        if (status?.value?.confirmationStatus === 'confirmed' || 
            status?.value?.confirmationStatus === 'finalized') {
          
          if (status.value.err) {
            console.error(`❌ Transaction failed:`, status.value.err);
            throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
          }
          
          console.log(`✅ Transaction confirmed successfully after ${i + 1} attempts`);
          return status;
        }
        
        console.log(`⏳ Waiting for confirmation... Attempt ${i + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`⏳ Error checking transaction... Attempt ${i + 1}/${maxAttempts}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new Error('Transaction confirmation timeout - Please check Solana Explorer to verify transaction status');
  };

  // Handle direct payment (deposit to treasury)
  const handleDirectPayment = async () => {
    if (!isConnected || !walletAddress || !publicKey) {
      toast.error('Please connect your Phantom wallet');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!validateShippingForm()) {
      return;
    }

    setPlacingOrder(true);
    
    let depositSignature = null;

    try {
      const shippingSaved = await saveOrUpdateShipping();
      if (!shippingSaved) {
        setPlacingOrder(false);
        return;
      }

      const decimals = 6; // Solana SPL tokens use 9 decimals

      console.log('🔄 Starting Solana payment process:', {
        itemCount: items.length,
        walletAddress,
        selectedTokenMint,
        treasuryPubkey: REACT_APP_TREASURY_PUBKEY
      });

      // Calculate total amount
      const totalAmount = items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      const amountInSmallestUnit = Math.floor(totalAmount * Math.pow(10, decimals));

      console.log('💰 Payment amount:', {
        totalUSD: totalAmount.toFixed(2),
        amountInSmallestUnit: amountInSmallestUnit.toString()
      });

      // Get token mint and treasury addresses
      const tokenMintPubkey = new PublicKey(selectedTokenMint);
      const treasuryPubkey = new PublicKey(REACT_APP_TREASURY_PUBKEY);
      const senderPubkey = publicKey;

      // Get associated token addresses
      const senderTokenAddress = await getAssociatedTokenAddress(
        tokenMintPubkey,
        senderPubkey
      );

      const treasuryTokenAddress = await getAssociatedTokenAddress(
        tokenMintPubkey,
        treasuryPubkey
      );

      console.log('📍 Token addresses:', {
        sender: senderTokenAddress.toBase58(),
        treasury: treasuryTokenAddress.toBase58()
      });

      // Check if sender has token account and sufficient balance
      let senderAccountExists = true;
      try {
        const senderAccount = await getAccount(connection, senderTokenAddress);
        const senderBalance = Number(senderAccount.amount);
        
        if (senderBalance < amountInSmallestUnit) {
          toast.error(`Insufficient balance. You have ${(senderBalance / Math.pow(10, decimals)).toFixed(2)} ${getTokenSymbolByMint(selectedTokenMint)}`);
          setPlacingOrder(false);
          return;
        }
      } catch {
        senderAccountExists = false;
        toast.error('You do not have a token account for this token. Please add tokens to your wallet first.');
        setPlacingOrder(false);
        return;
      }

      // Create transaction
      const transaction = new Transaction();

      // Check if treasury token account exists, if not create it
      try {
        await getAccount(connection, treasuryTokenAddress);
        console.log('✅ Treasury token account exists');
      } catch {
        console.log('📝 Creating associated token account for treasury...');
        
        const createATAInstruction = createAssociatedTokenAccountInstruction(
          senderPubkey, // payer
          treasuryTokenAddress, // associatedToken
          treasuryPubkey, // owner
          tokenMintPubkey // mint
        );
        
        transaction.add(createATAInstruction);
      }

      // Add transfer instruction (deposit to treasury)
      const transferInstruction = createTransferInstruction(
        senderTokenAddress, // source
        treasuryTokenAddress, // destination
        senderPubkey, // owner
        amountInSmallestUnit, // amount
        [], // multiSigners
        TOKEN_PROGRAM_ID
      );

      transaction.add(transferInstruction);

      console.log('📤 Sending deposit transaction...');
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPubkey;

      // Send transaction
      const signatureToast = toast.loading('Please confirm the deposit in your wallet...');
      
      depositSignature = await sendTransaction(transaction, connection);
      
      toast.dismiss(signatureToast);
      console.log('📋 Deposit transaction signature:', depositSignature);
      
      // Wait for confirmation
      const confirmationToast = toast.loading('Waiting for blockchain confirmation...');
      await waitForTransactionConfirmation(depositSignature);
      toast.dismiss(confirmationToast);
      toast.success('Deposit confirmed on blockchain!');

      // Now save order to backend
      const tokenSymbol = getTokenSymbolByMint(selectedTokenMint);
      const isSingleItem = items.length === 1;

      if (isSingleItem) {
        const item = items[0];
        
        const singleOrderPayload = {
          productId: item.id,
          quantity: item.quantity,
          amount: (item.price * item.quantity).toFixed(2),
          token: tokenSymbol,
          transactionHash: depositSignature,
          buyer: walletAddress,
          blockchain: 'solana',
          tokenMint: selectedTokenMint,
          depositAmount: totalAmount.toFixed(2)
        };

        console.log('📤 Single order payload:', singleOrderPayload);

        await axios.post(
          API_ENDPOINTS.ORDERS_CREATE,
          singleOrderPayload,
          { headers: authHeaders() }
        );

      } else {
        const orderItems = items.map((item, index) => ({
          productId: item.id,
          quantity: item.quantity,
          amount: (item.price * item.quantity).toFixed(2),
          itemIndex: index
        }));

        const batchOrderPayload = {
          items: orderItems,
          token: tokenSymbol,
          transactionHash: depositSignature,
          totalAmount: totalAmount.toFixed(2),
          buyer: walletAddress,
          blockchain: 'solana',
          tokenMint: selectedTokenMint,
          depositAmount: totalAmount.toFixed(2)
        };

        console.log('📤 Batch order payload:', batchOrderPayload);

        await axios.post(
          API_ENDPOINTS.ORDERS_CREATE_BATCH,
          batchOrderPayload,
          { headers: authHeaders() }
        );
      }

      toast.success(
        `Order placed successfully for ${items.length} item${items.length > 1 ? 's' : ''}!`
      );

      // Clear cart
      for (const item of items) {
        await handleRemoveFromCart(item.id);
      }

      setTimeout(() => {
        navigate('/purchased-products');
      }, 2000);

    } catch (err) {
      console.error('Order placement failed:', err);

      let errorMessage = 'Failed to place order';
      
      if (err.message) {
        if (err.message.includes('User rejected') || err.message.includes('cancelled')) {
          errorMessage = 'Transaction was cancelled';
        } else if (err.message.includes('confirmation timeout')) {
          errorMessage = 'Transaction is taking longer than expected. The transaction may still be processing on the blockchain.';
          
          if (depositSignature) {
            setTimeout(() => {
              toast.error(
                <div>
                  <div>Signature: {depositSignature.slice(0, 10)}...{depositSignature.slice(-8)}</div>
                  <div className="mt-2">
                    <a 
                      href={`https://explorer.solana.com/tx/${depositSignature}?cluster=mainnet-beta`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#fff', textDecoration: 'underline' }}
                    >
                      View on Solana Explorer →
                    </a>
                  </div>
                </div>,
                { duration: 10000 }
              );
            }, 1000);
          }
        } else if (err.message.includes('insufficient')) {
          errorMessage = 'Insufficient balance for transaction';
        } else {
          errorMessage = err.message;
        }
      }

      toast.error(errorMessage);
    } finally {
      setPlacingOrder(false);
    }
  };

  const handlePlaceOrder = () => {
    if (paymentMethod === 'wallet') {
      handleWalletPayment();
    } else {
      handleDirectPayment();
    }
  };

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  if (loading) {
    return (
      <section className="checkout py-80">
        <div className="container container-lg">
          <div className="text-center text-gray-600">Loading checkout...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="checkout py-80">
      <div className="container container-lg">
        <div className="row">
          <div className="col-xl-9 col-lg-8">
            <form onSubmit={(e) => e.preventDefault()} className="pe-xl-5">
              <h6 className="text-xl mb-32">Shipping Information</h6>
              <div className="row gy-3">
                <div className="col-sm-6">
                  <input
                    type="text"
                    name="firstName"
                    value={shippingData.firstName}
                    onChange={handleInputChange}
                    className="common-input border-gray-100"
                    placeholder="First Name *"
                    required
                  />
                </div>
                <div className="col-sm-6">
                  <input
                    type="text"
                    name="lastName"
                    value={shippingData.lastName}
                    onChange={handleInputChange}
                    className="common-input border-gray-100"
                    placeholder="Last Name *"
                    required
                  />
                </div>
                <div className="col-12">
                  <input
                    type="email"
                    name="email"
                    value={shippingData.email}
                    onChange={handleInputChange}
                    className="common-input border-gray-100"
                    placeholder="Email Address *"
                    required
                  />
                </div>
                <div className="col-sm-6">
                  <input
                    type="tel"
                    name="mobileNumber"
                    value={shippingData.mobileNumber}
                    onChange={handleInputChange}
                    className="common-input border-gray-100"
                    placeholder="Mobile Number *"
                    required
                  />
                </div>
                <div className="col-sm-6">
                  <input
                    type="tel"
                    name="otherMobileNumber"
                    value={shippingData.otherMobileNumber}
                    onChange={handleInputChange}
                    className="common-input border-gray-100"
                    placeholder="Other Mobile Number (Optional)"
                  />
                </div>
                <div className="col-12">
                  <input
                    type="text"
                    name="country"
                    value={shippingData.country}
                    onChange={handleInputChange}
                    className="common-input border-gray-100"
                    placeholder="Country *"
                    required
                  />
                </div>
                <div className="col-12">
                  <input
                    type="text"
                    name="streetAddress"
                    value={shippingData.streetAddress}
                    onChange={handleInputChange}
                    className="common-input border-gray-100"
                    placeholder="Street Address *"
                    required
                  />
                </div>
                <div className="col-sm-6">
                  <input
                    type="text"
                    name="city"
                    value={shippingData.city}
                    onChange={handleInputChange}
                    className="common-input border-gray-100"
                    placeholder="City *"
                    required
                  />
                </div>
                <div className="col-sm-6">
                  <input
                    type="text"
                    name="state"
                    value={shippingData.state}
                    onChange={handleInputChange}
                    className="common-input border-gray-100"
                    placeholder="State *"
                    required
                  />
                </div>
                <div className="col-12">
                  <input
                    type="text"
                    name="zipCode"
                    value={shippingData.zipCode}
                    onChange={handleInputChange}
                    className="common-input border-gray-100"
                    placeholder="Zip Code *"
                    required
                  />
                </div>
              </div>
            </form>
          </div>
          <div className="col-xl-3 col-lg-4">
            <div className="checkout-sidebar">
              <div className="border border-gray-100 rounded-8 px-24 py-40 mt-24">
                <div className="mb-32 pb-32 border-bottom border-gray-100 flex-between gap-8">
                  <span className="text-gray-900 fw-medium text-xl">
                    Product
                  </span>
                  <span className="text-gray-900 fw-medium text-xl">
                    Subtotal
                  </span>
                </div>

                {items.map((item) => (
                  <div key={item.id} className="flex-between gap-24 mb-32">
                    <div className="flex-align gap-12">
                      <span className="text-gray-900 fw-normal text-md w-144">
                        {item.name}
                      </span>
                      <span className="text-gray-900 fw-normal text-md">
                        <i className="ph-bold ph-x" />
                      </span>
                      <span className="text-gray-900 fw-semibold text-md">
                        {item.quantity}
                      </span>
                    </div>
                    <span className="text-gray-900 fw-bold text-md">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}

                <div className="border-top border-gray-100 pt-30 mt-30">
                  {/* Payment Method Selection */}
                  <div className="mb-24">
                    <label className="fw-semibold mb-12 d-block">Payment Method:</label>
                    <div className="flex-align gap-12 mb-16">
                      <button
                        type="button"
                        className={`btn ${paymentMethod === 'direct' ? 'btn-main-two' : 'btn-outline-main-two'} py-12 px-24 flex-1`}
                        onClick={() => setPaymentMethod('direct')}
                        disabled={placingOrder}
                      >
                        Pay Directly
                      </button>
                      <button
                        type="button"
                        className={`btn ${paymentMethod === 'wallet' ? 'btn-main-two' : 'btn-outline-main-two'} py-12 px-24 flex-1`}
                        onClick={() => setPaymentMethod('wallet')}
                        disabled={placingOrder}
                      >
                        Use Wallet
                      </button>
                    </div>
                    {paymentMethod === 'wallet' && isConnected && (
                      <div className="alert alert-info py-12 px-16 text-sm">
                        {(() => {
                          const symbol = getTokenSymbolByMint(selectedTokenMint);
                          const backendBalance = walletBalance[`${symbol}_BACKEND`] || 0;
                          return symbol
                            ? `Available: ${backendBalance.toString()} ${symbol}`
                            : 'Unsupported token';
                        })()}
                      </div>
                    )}
                    {paymentMethod === 'direct' && isConnected && (
                      <div className="alert alert-warning py-12 px-16 text-sm">
                        {(() => {
                          const symbol = getTokenSymbolByMint(selectedTokenMint);
                          console.log('On-chain Symbol da naa te wallet balance', symbol, walletBalance);
                          console.log('On-chain Symbol da naa te wallet balance', symbol, walletBalance);
                          const onChainBalance = walletBalance[symbol] || 0;
                          return symbol
                            ? `Wallet Balance: ${onChainBalance.toString()} ${symbol}`
                            : 'Unsupported token';
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="mb-16">
                    <label className="fw-semibold mb-8 d-block">Token:</label>
                    <select
                      className="form-control"
                      value={selectedTokenMint}
                      onChange={(e) => {
                        setSelectedTokenMint(e.target.value);
                        localStorage.setItem('selectedPaymentToken', e.target.value);
                      }}
                      disabled={placingOrder}
                    >
                      <option value={REACT_APP_USDT_MINT}>USDT (SPL)</option>
                      <option value={REACT_APP_USDC_MINT}>USDC (SPL)</option>
                    </select>
                  </div>

                  <div className="mb-32 flex-between gap-8">
                    <span className="text-gray-900 text-xl fw-semibold">
                      Subtotal
                    </span>
                    <span className="text-gray-900 text-md fw-bold">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="mb-0 flex-between gap-8">
                    <span className="text-gray-900 text-xl fw-semibold">
                      Total
                    </span>
                    <span className="text-gray-900 text-md fw-bold">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder || items.length === 0 || !isConnected}
                className="btn btn-main-two mt-40 py-18 w-100 rounded-8"
              >
                {placingOrder ? 'Processing Payment...' : 'Place Order'}
              </button>

              {!isConnected && (
                <p className="text-center text-danger mt-3">
                  Please connect your Phantom wallet to place order
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Checkout;