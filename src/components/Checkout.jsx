import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/api';

const { REACT_APP_CONTRACT_ADDRESS, REACT_APP_USDT_ADDRESS, REACT_APP_USDC_ADDRESS } = process.env;

const getTokenSymbolByAddress = (address) => {
  if (!address) return null;

  // TRON addresses are case-sensitive, so compare directly
  if (address === REACT_APP_USDT_ADDRESS) return 'USDT';
  if (address === REACT_APP_USDC_ADDRESS) return 'USDC';

  return null;
};

const Checkout = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [selectedToken, setSelectedToken] = useState(REACT_APP_USDT_ADDRESS);
  const [paymentMethod, setPaymentMethod] = useState('direct'); // 'direct' or 'wallet'
  const [walletBalance, setWalletBalance] = useState({ USDT: 0, USDC: 0 });

  // TronLink wallet state
  const [tronWeb, setTronWeb] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

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

  // Check for TronLink wallet connection
  useEffect(() => {
    const checkTronLink = () => {
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
    const timer = setTimeout(checkTronLink, 1000);
    
    // Listen for wallet connection events
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
      clearTimeout(timer);
      window.removeEventListener('tronWalletConnected', handleWalletConnected);
      window.removeEventListener('tronWalletDisconnected', handleWalletDisconnected);
    };
  }, []);

  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    if (!walletAddress || !isConnected) return;

    try {
      const tokenSymbol = getTokenSymbolByAddress(selectedToken);
      if (!tokenSymbol) {
        toast.error('Unsupported token selected');
        return;
      }

      const response = await axios.get(
        API_ENDPOINTS.WALLET_BALANCE(walletAddress, tokenSymbol),
        { headers: authHeaders() }
      );

      if (response.data.success) {
        const balance = Number(response.data.data.availableBalance || 0);
        setWalletBalance(prev => ({
          ...prev,
          [tokenSymbol]: balance
        }));
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  useEffect(() => {
    if (isConnected && walletAddress && paymentMethod === 'wallet') {
      fetchWalletBalance();
    }
  }, [walletAddress, isConnected, selectedToken, paymentMethod]);

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
      const res = await axios.get('https://tron-backend.vercel.app/api/shipping/me', {
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
      setSelectedToken(savedToken);
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

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shippingData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const saveOrUpdateShipping = async () => {
    try {
      // Try to update first
      await axios.put('https://tron-backend.vercel.app/api/shipping', shippingData, {
        headers: authHeaders(),
      });
      return true;
    } catch (err) {
      // If update fails, try to create
      try {
        await axios.post('https://tron-backend.vercel.app/api/shipping', shippingData, {
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

  // Handle wallet payment
  const handleWalletPayment = async () => {
    if (!isConnected || !walletAddress) {
      toast.error('Please connect your TronLink wallet');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!validateShippingForm()) {
      return;
    }

    const tokenSymbol = getTokenSymbolByAddress(selectedToken);
    if (!tokenSymbol) {
      toast.error('Unsupported token selected');
      return;
    }
    const totalAmount = subtotal;

    if (walletBalance[tokenSymbol] < totalAmount) {
      toast.error(`Insufficient wallet balance. Available: ${walletBalance[tokenSymbol].toFixed(2)} ${tokenSymbol}, Required: ${totalAmount.toFixed(2)} ${tokenSymbol}`);
      return;
    }

    setPlacingOrder(true);

    try {
      // Save shipping information first
      const shippingSaved = await saveOrUpdateShipping();
      if (!shippingSaved) {
        setPlacingOrder(false);
        return;
      }

      // Prepare order items
      const orderItems = items.map((item) => ({
        id: item.id,
        quantity: item.quantity
      }));

      // Process wallet payment via backend
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

        // Clear cart
        for (const item of items) {
          await handleRemoveFromCart(item.id);
        }

        // Refresh wallet balance
        fetchWalletBalance();

        // Redirect to orders page
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

  // Helper function to wait for transaction confirmation
  const waitForTransactionConfirmation = async (txHash, maxAttempts = 40) => {
    console.log(`🔍 Waiting for transaction confirmation: ${txHash}`);
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // First check if transaction exists
        const tx = await tronWeb.trx.getTransaction(txHash);
        
        if (!tx) {
          console.log(`⏳ Transaction not found yet... Attempt ${i + 1}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }

        // Then check transaction info
        const txInfo = await tronWeb.trx.getTransactionInfo(txHash);
        
        console.log(`📋 Transaction info (Attempt ${i + 1}/${maxAttempts}):`, {
          id: txInfo.id,
          blockNumber: txInfo.blockNumber,
          blockTimeStamp: txInfo.blockTimeStamp,
          receipt: txInfo.receipt ? 'present' : 'missing',
          result: txInfo.receipt?.result
        });
        
        // Check if transaction is confirmed
        // A transaction is confirmed if it has a blockNumber
        if (txInfo && txInfo.blockNumber) {
          // Check if it was successful
          if (txInfo.receipt && txInfo.receipt.result) {
            if (txInfo.receipt.result === 'SUCCESS') {
              console.log(`✅ Transaction confirmed successfully after ${i + 1} attempts`);
              return txInfo;
            } else {
              console.error(`❌ Transaction failed with result: ${txInfo.receipt.result}`);
              throw new Error(`Transaction failed: ${txInfo.receipt.result}`);
            }
          }
          
          // If no receipt yet but has blockNumber, transaction is pending
          if (!txInfo.receipt && txInfo.blockNumber) {
            console.log(`⏳ Transaction in block but no receipt yet... Attempt ${i + 1}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }
        }
        
        console.log(`⏳ Waiting for confirmation... Attempt ${i + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between checks
        
      } catch (error) {
        console.log(`⏳ Error checking transaction... Attempt ${i + 1}/${maxAttempts}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Before throwing timeout error, do one final check
    try {
      const finalTxInfo = await tronWeb.trx.getTransactionInfo(txHash);
      if (finalTxInfo && finalTxInfo.blockNumber) {
        console.log(`✅ Transaction found in final check!`);
        return finalTxInfo;
      }
    } catch (error) {
      console.error('Final check failed:', error);
    }
    
    throw new Error('Transaction confirmation timeout - Please check TronScan to verify transaction status');
  };

  // Handle direct payment (on-chain via TronLink)
  const handleDirectPayment = async () => {
    if (!isConnected || !walletAddress || !tronWeb) {
      toast.error('Please connect your TronLink wallet');
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
    
    let paymentTx = null; // Declare here to access in catch block

    try {
      // Save shipping information first
      const shippingSaved = await saveOrUpdateShipping();
      if (!shippingSaved) {
        setPlacingOrder(false);
        return;
      }

      const isSingleItem = items.length === 1;
      const decimals = 6; // TRON TRC20 uses 6 decimals

      console.log('🔄 Starting payment process:', {
        isSingleItem,
        itemCount: items.length,
        walletAddress,
        selectedToken,
        contractAddress: REACT_APP_CONTRACT_ADDRESS
      });

      // Prepare amounts in SUN (smallest unit)
      const amounts = items.map((item) => {
        const amount = item.price * item.quantity;
        return Math.floor(amount * Math.pow(10, decimals));
      });

      const totalAmount = amounts.reduce((a, b) => a + b, 0);

      console.log('💰 Payment amounts:', {
        amounts: amounts.map(a => a.toString()),
        totalAmount: totalAmount.toString()
      });

      // Get token contract
      const tokenContract = await tronWeb.contract().at(selectedToken);

      // 1️⃣ Approve token spending
      console.log('✅ Approving token spending...');
      const approveTx = await tokenContract.approve(
        REACT_APP_CONTRACT_ADDRESS,
        totalAmount
      ).send({
        feeLimit: 100000000, // 100 TRX
        callValue: 0,
        shouldPollResponse: false // Get hash immediately
      });

      console.log('✅ Approval transaction hash:', approveTx);
      
      // Wait for approval confirmation
      const approvalToast = toast.loading('Waiting for approval confirmation...');
      await waitForTransactionConfirmation(approveTx);
      toast.dismiss(approvalToast);
      toast.success('Token approval confirmed!');

      // Get main contract
      const mainContract = await tronWeb.contract().at(REACT_APP_CONTRACT_ADDRESS);

      // 2️⃣ Call correct contract function
      if (isSingleItem) {
        const item = items[0];

        console.log('📦 Single order payment:', {
          productId: item.id,
          amount: amounts[0].toString(),
          token: selectedToken
        });

        paymentTx = await mainContract.createAndPayForOrder(
          item.id,
          amounts[0],
          selectedToken
        ).send({
          feeLimit: 150000000, // 150 TRX
          callValue: 0,
          shouldPollResponse: false // Get hash immediately
        });

      } else {
        const productIds = items.map((item) => item.id);

        console.log('📦 Multiple orders payment:', {
          productIds,
          amounts: amounts.map(a => a.toString()),
          token: selectedToken
        });

        paymentTx = await mainContract.createAndPayForMultipleOrders(
          productIds,
          amounts,
          selectedToken
        ).send({
          feeLimit: 200000000, // 200 TRX
          callValue: 0,
          shouldPollResponse: false // Get hash immediately
        });
      }

      console.log('📋 Payment transaction hash:', paymentTx);
      
      // Wait for payment transaction confirmation
      const paymentToast = toast.loading('Waiting for payment confirmation...');
      const txInfo = await waitForTransactionConfirmation(paymentTx);
      toast.dismiss(paymentToast);
      toast.success('Payment confirmed on blockchain!');

      console.log('📋 Transaction info:', txInfo);

      // 3️⃣ Extract orderIds from transaction
      // For single orders: contractResult[0] contains the returned orderId
      // For batch orders: we need to parse events
      const paymentEvents = [];
      
      // STRATEGY 1: Try contractResult first (most reliable for single orders)
      if (isSingleItem && txInfo.contractResult && txInfo.contractResult.length > 0) {
        try {
          console.log('🔍 Extracting single orderId from contractResult...');
          const resultHex = txInfo.contractResult[0];
          console.log('📝 contractResult[0]:', resultHex);
          
          const orderId = parseInt(resultHex, 16);
          console.log('✅ Extracted orderId from contractResult:', orderId);
          
          if (!isNaN(orderId) && orderId > 0) {
            paymentEvents.push({ orderId });
            console.log('✅ Successfully extracted orderId:', orderId);
          }
        } catch (error) {
          console.error('❌ Error extracting from contractResult:', error);
        }
      }

      // STRATEGY 2: Parse PaymentReceived events (for batch orders or as fallback)
      if (paymentEvents.length === 0) {
        console.log('🔍 Attempting to extract orderIds from event logs...');
        
        // PaymentReceived event signature hash
        const PAYMENT_RECEIVED_SIGNATURE = '62b4265ef816f751a94c5c93fa40a90302c6924509b973ed4094dcf30c6c61ed';
        
        if (txInfo.log && txInfo.log.length > 0) {
          console.log('🔍 Total logs found:', txInfo.log.length);
          
          for (const log of txInfo.log) {
            // Check if this is a PaymentReceived event
            if (log.topics && log.topics.length >= 3 && log.topics[0] === PAYMENT_RECEIVED_SIGNATURE) {
              try {
                // For PaymentReceived(uint256 indexed orderId, address indexed buyer, ...)
                // topics[0] = event signature hash
                // topics[1] = orderId (first indexed param)
                // topics[2] = buyer address (second indexed param)
                
                const orderIdHex = log.topics[1];
                console.log('📝 OrderId hex from event topics[1]:', orderIdHex);
                
                const orderId = parseInt(orderIdHex, 16);
                console.log('✅ Found PaymentReceived event with orderId:', orderId);
                
                if (!isNaN(orderId) && orderId > 0) {
                  paymentEvents.push({ orderId });
                }
              } catch (error) {
                console.error('❌ Error parsing orderId from event:', error);
              }
            }
          }
        }
      }

      console.log('📋 Extracted payment events:', paymentEvents);

      const onChainOrderIds = paymentEvents.map(e => e.orderId.toString());

      console.log('📋 On-chain order IDs:', onChainOrderIds);

      // Validate we got order IDs
      if (onChainOrderIds.length === 0) {
        console.error('❌ CRITICAL: No order IDs extracted from transaction!');
        console.error('Transaction hash:', paymentTx);
        console.error('Transaction info:', JSON.stringify(txInfo, null, 2));
        throw new Error(
          'Failed to extract order ID from blockchain transaction. ' +
          'The payment was successful but order tracking failed. ' +
          'Please contact support with transaction hash: ' + paymentTx
        );
      }

      // 4️⃣ Save order to backend
      const tokenSymbol = getTokenSymbolByAddress(selectedToken);

      if (isSingleItem) {
        const item = items[0];
        
        const onChainOrderId = Number(onChainOrderIds[0]);
        
        if (!onChainOrderId || onChainOrderId === 0) {
          throw new Error('Invalid order ID extracted from blockchain');
        }

        const singleOrderPayload = {
          productId: item.id,
          quantity: item.quantity,
          amount: (item.price * item.quantity).toFixed(2),
          token: tokenSymbol,
          onChainOrderId: onChainOrderId,
          transactionHash: paymentTx,
          buyer: walletAddress,
        };

        console.log('📤 Single order payload:', singleOrderPayload);

        await axios.post(
          API_ENDPOINTS.ORDERS_CREATE,
          singleOrderPayload,
          { headers: authHeaders() }
        );

      } else {
        // Validate all order IDs
        for (let i = 0; i < items.length; i++) {
          if (!onChainOrderIds[i] || Number(onChainOrderIds[i]) === 0) {
            throw new Error(`Invalid order ID for item ${i + 1} extracted from blockchain`);
          }
        }
        
        const orderItems = items.map((item, index) => ({
          productId: item.id,
          quantity: item.quantity,
          amount: (item.price * item.quantity).toFixed(2),
          onChainOrderId: Number(onChainOrderIds[index]),
        }));

        const batchOrderPayload = {
          items: orderItems,
          token: tokenSymbol,
          transactionHash: paymentTx,
          totalAmount: items
            .reduce((sum, item) => sum + item.price * item.quantity, 0)
            .toFixed(2),
          buyer: walletAddress,
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
        if (err.message.includes('Confirmation declined') || err.message.includes('cancelled')) {
          errorMessage = 'Transaction was cancelled';
        } else if (err.message.includes('confirmation timeout')) {
          // Show a more helpful message with the transaction hash if available
          errorMessage = 'Transaction is taking longer than expected. The transaction may still be processing on the blockchain. Please check TronScan and contact support if needed.';
          
          // Show additional toast with link if we have transaction hash
          if (paymentTx) {
            setTimeout(() => {
              toast.error(
                <div>
                  <div>Transaction Hash: {paymentTx.slice(0, 10)}...{paymentTx.slice(-8)}</div>
                  <div className="mt-2">
                    <a 
                      href={`https://tronscan.org/#/transaction/${paymentTx}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#fff', textDecoration: 'underline' }}
                    >
                      View on TronScan →
                    </a>
                  </div>
                </div>,
                { duration: 10000 }
              );
            }, 1000);
          }
        } else if (err.message.includes('bandwidth')) {
          errorMessage = 'Insufficient bandwidth. Please try again later.';
        } else if (err.message.includes('energy')) {
          errorMessage = 'Insufficient energy. Please try again later.';
        } else if (err.message.includes('Transaction failed')) {
          errorMessage = err.message;
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
                      <span className="text-gray-900 fw-normal text-md  w-144">
                        {item.name}
                      </span>
                      <span className="text-gray-900 fw-normal text-md ">
                        <i className="ph-bold ph-x" />
                      </span>
                      <span className="text-gray-900 fw-semibold text-md ">
                        {item.quantity}
                      </span>
                    </div>
                    <span className="text-gray-900 fw-bold text-md ">
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
                          const symbol = getTokenSymbolByAddress(selectedToken);
                          return symbol
                            ? `Available: ${walletBalance[symbol].toString()} ${symbol}`
                            : 'Unsupported token';
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="mb-16">
                    <label className="fw-semibold mb-8 d-block">Token:</label>
                    <select
                      className="form-control"
                      value={selectedToken}
                      onChange={(e) => setSelectedToken(e.target.value)}
                      disabled={placingOrder}
                    >
                      <option value={REACT_APP_USDT_ADDRESS}>USDT (TRC20)</option>
                      <option value={REACT_APP_USDC_ADDRESS}>USDC (TRC20)</option>
                    </select>
                  </div>

                  <div className="mb-32 flex-between gap-8">
                    <span className="text-gray-900  text-xl fw-semibold">
                      Subtotal
                    </span>
                    <span className="text-gray-900  text-md fw-bold">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="mb-0 flex-between gap-8">
                    <span className="text-gray-900  text-xl fw-semibold">
                      Total
                    </span>
                    <span className="text-gray-900  text-md fw-bold">
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
                  Please connect your TronLink wallet to place order
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