import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import QuantityControl from '../helper/QuantityControl';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/api';
import { ethers } from 'ethers';
import ecommercePaymentAbi from '../abi/ecommercePaymentAbi.json';
import { useWallet } from '../context/WalletContext';

const { REACT_APP_CONTRACT_ADDRESS, REACT_APP_USDT_ADDRESS, REACT_APP_USDC_ADDRESS } = process.env;

const CartSection = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [buyingId, setBuyingId] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Blockchain state
  // const [provider, setProvider] = useState(null);
  // const [signer, setSigner] = useState(null);
  // const [contract, setContract] = useState(null);
  const { provider, signer, contract,
    connectWallet
  } = useWallet();

  const [selectedToken, setSelectedToken] = useState(REACT_APP_USDT_ADDRESS);



  const authHeaders = () => {
    const token = localStorage.getItem('userToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

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
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await axios.get(API_ENDPOINTS.CART, {
        headers: authHeaders(),
      });

      const payload = res.data;
      console.log("API payload:", payload);

      const list = Array.isArray(payload?.cart) ? payload.cart : [];
      const normalizedItems = normalizeCartItems(list);
      setItems(normalizedItems);

      console.log("Normalized cart items:", normalizedItems);
    } catch (err) {
      console.error('Cart fetch failed', err);
      setError('Failed to load cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // const connectWallet = async () => {
  //   if (window.ethereum) {
  //     try {
  //       // 1. Request accounts from MetaMask
  //       await window.ethereum.request({ method: 'eth_requestAccounts' });

  //       // 2. Initialize the Provider (v6 syntax)
  //       const prov = new ethers.BrowserProvider(window.ethereum);

  //       // 3. Get the Signer (v6 returns a Promise)
  //       const sig = await prov.getSigner();

  //       // 4. Initialize the Contract
  //       // Ensure REACT_APP_CONTRACT_ADDRESS and ecommercePaymentAbi.abi are defined
  //       const cont = new ethers.Contract(
  //         process.env.REACT_APP_CONTRACT_ADDRESS, 
  //         ecommercePaymentAbi.abi, 
  //         sig
  //       );

  //       // 5. Update state
  //       setProvider(prov);
  //       setSigner(sig);
  //       setContract(cont);

  //     } catch (err) {
  //       toast.error('Wallet connection failed');
  //       console.error("Connection Error:", err);
  //     }
  //   } else {
  //     toast.error('Please install MetaMask');
  //   }
  // };


  useEffect(() => {
    fetchCart();

    // if (window.ethereum) {
    //   connectWallet();
    // }.

  }, []);

  const handleRemove = async (productId, showToast = true) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      navigate('/account');
      return;
    }
    try {
      await axios.delete(API_ENDPOINTS.CART, {
        headers: authHeaders(),
        data: { productId },
      });
      if (showToast) toast.success('Removed from cart');
      window.dispatchEvent(new Event('cartUpdated'));
      fetchCart();
    } catch (err) {
      console.error('Remove from cart failed', err);
      toast.error(err?.response?.data?.message || 'Failed to remove item');
    }
  };

  // const handleQuantityChange = async (productId, quantity) => {
  //   console.log("cart quantity changed", productId, quantity);

  //   const token = localStorage.getItem('userToken');
  //   if (!token) {
  //     navigate('/account');
  //     return;
  //   }

  //   // Optimistically update UI
  //   setItems(prevItems =>
  //     prevItems.map(item =>
  //       item.id === productId ? { ...item, quantity } : item
  //     )
  //   );

  //   setUpdatingId(productId);

  //   try {
  //     await axios.post(
  //       API_ENDPOINTS.CART,
  //       { productId, quantity },
  //       { headers: authHeaders() }
  //     );

  //     window.dispatchEvent(new Event('cartUpdated'));
  //     // Fetch fresh data after successful update
  //     await fetchCart();
  //   } catch (err) {
  //     console.error('Update cart failed', err);
  //     toast.error('Failed to update quantity');
  //     // Revert on error
  //     await fetchCart();
  //   } finally {
  //     setUpdatingId(null);
  //   }
  // };

  const handleQuantityChange = async (productId, quantity) => {
    console.log("cart quantity changed", productId, quantity);

    const token = localStorage.getItem('userToken');
    if (!token) {
      navigate('/account');
      return;
    }

    // Check if already updating this product
    if (updatingId === productId) {
      console.log("Already updating, ignoring duplicate call");
      return;
    }

    setUpdatingId(productId);

    try {
      // Make the API call
      await axios.post(
        API_ENDPOINTS.CART,
        { productId, quantity },
        { headers: authHeaders() }
      );

      // Update local state manually instead of fetching
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === productId ? { ...item, quantity: quantity } : item
        )
      );

      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      console.error('Update cart failed', err);
      toast.error('Failed to update quantity');
      // On error, fetch fresh data
      fetchCart();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBuyNow = async () => {

    console.log("inside handle buy now", items[0]);
    let item = items[0];

    if (!contract) {
      await connectWallet();
      if (!contract) return;
    }
  
    const token = localStorage.getItem('userToken');
    if (!token) {
      navigate('/account');
      return;
    }
  
    setBuyingId(item.id);
  
    try {
      const amount = ethers.parseUnits((item.price * item.quantity).toString(), 18); // 6 decimals for USDT/USDC
      const tokenContract = new ethers.Contract(
        selectedToken,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        signer
      );

      const approveTx = await tokenContract.approve(REACT_APP_CONTRACT_ADDRESS, amount);
      await approveTx.wait();
  
      const tx = await contract.createAndPayForOrder(item.id, amount, selectedToken);
      const receipt = await tx.wait();
  
      const paymentEvent = receipt.logs
        .map((log) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e) => e?.name === 'PaymentReceived');
  
        console.log("paymentEvent", paymentEvent);

      const onChainOrderId = paymentEvent ? paymentEvent.args.orderId.toString() : null;

      console.log("onChainOrderId", onChainOrderId);
      console.log("receipt", receipt);
      console.log("receipt hash", receipt.hash);
  
      await axios.post(
        API_ENDPOINTS.ORDERS_CREATE,
        {
          productId: item.id,
          amount: item.price * item.quantity,
          quantity: item.quantity, // Include quantity
          token: selectedToken === REACT_APP_USDT_ADDRESS ? 'USDT' : 'USDC',
          onChainOrderId,
          transactionHash: receipt.hash,
          buyer: await signer.getAddress()
        },
        { headers: authHeaders() }
      );
  
      toast.success('Order placed from cart');
      await handleRemove(item.id, false);
    } catch (err) {
      console.error('Buy now failed', err);
      toast.error(err?.response?.data?.message || 'Failed to place order');
    } finally {
      setBuyingId(null);
    }
  };
  

  const handlePlaceOrder = async () => {
    if (!contract) {
      await connectWallet();
      if (!contract) return;
    }
  
    if (items.length === 0) return;
  
    setPlacingOrder(true);
  
    try {
      const productIds = items.map((item) => item.id);
      const amounts = items.map((item) => ethers.parseUnits((item.price * item.quantity).toString(), 18)); // 6 decimals for USDT/USDC
      const totalAmount = amounts.reduce((a, b) => a + b, 0n);
  
      const tokenContract = new ethers.Contract(
        selectedToken,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        signer
      );
      const approveTx = await tokenContract.approve(REACT_APP_CONTRACT_ADDRESS, totalAmount);
      await approveTx.wait();
  
      const tx = await contract.createAndPayForMultipleOrders(productIds, amounts, selectedToken);
      const receipt = await tx.wait();
  
      const paymentEvents = receipt.logs
        .map((log) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .filter((e) => e?.name === 'PaymentReceived');
  
      const onChainOrderIds = paymentEvents.map((e) => e.args.orderId.toString());
  
      const orderItems = items.map((item, index) => ({
        productId: item.id,
        quantity: item.quantity, // Include quantity
        amount: item.price * item.quantity,
        onChainOrderId: onChainOrderIds[index] || null,
      }));
  
      await axios.post(
        API_ENDPOINTS.ORDERS_CREATE_BATCH,
        {
          items: orderItems,
          token: selectedToken === REACT_APP_USDT_ADDRESS ? 'USDT' : 'USDC',
          transactionHash: receipt.hash,
          totalAmount: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
          buyer: await signer.getAddress()
        },
        { headers: authHeaders() }
      );
  
      toast.success(`Order placed for ${items.length} items & saved!`);
  
      for (const item of items) {
        await handleRemove(item.id, false);
      }
  
      fetchCart();
    } catch (err) {
      console.error(err);
      toast.error(err?.reason || err?.response?.data?.message || 'Order failed');
    } finally {
      setPlacingOrder(false);
    }
  };
  

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  if (loading) {
    return (
      <section className="cart py-80">
        <div className="container container-lg">
          <div className="text-center text-gray-600">Loading your cart...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="cart py-80">
        <div className="container container-lg">
          <div className="alert alert-danger text-center">{error}</div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="cart py-80">
        <div className="container container-lg text-center">
          <h5 className="mb-12">Your cart is empty</h5>
          <Link
            to="/"
            className="btn bg-main-600 text-white rounded-pill px-24 py-12"
          >
            Continue Shopping
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="cart py-80">
      <div className="container container-lg">
        <div className="row gy-4">
          <div className="col-xl-9 col-lg-8">
            <div className="cart-table border border-gray-100 rounded-8 px-24 py-32">
              <div className="overflow-x-auto scroll-sm scroll-sm-horizontal">
                <table className="table style-three">
                  <thead>
                    <tr>
                      <th className="h6 mb-0 text-lg fw-bold">Delete</th>
                      <th className="h6 mb-0 text-lg fw-bold">Product Name</th>
                      <th className="h6 mb-0 text-lg fw-bold">Price</th>
                      <th className="h6 mb-0 text-lg fw-bold">Quantity</th>
                      <th className="h6 mb-0 text-lg fw-bold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            className="remove-tr-btn flex-align gap-12 hover-text-danger-600"
                            disabled={updatingId === item.id || buyingId === item.id}
                          >
                            <i className="ph ph-x-circle text-2xl d-flex" />
                            Remove
                          </button>
                        </td>
                        <td>
                          <div className="table-product d-flex align-items-center gap-16">
                            <Link
                              to={`/product-details/${item.id}`}
                              className="table-product__thumb border border-gray-100 rounded-8 flex-center "
                            >
                              <img
                                src={item.image || '/images/no-image.svg'}
                                alt={item.name}
                                onError={(e) => {
                                  e.target.src = '/images/no-image.svg';
                                }}
                              />
                            </Link>
                            <div className="table-product__content text-start">
                              <h6 className="title text-lg fw-semibold mb-8">
                                <Link
                                  to={`/product-details/${item.id}`}
                                  className="link text-line-2"
                                  tabIndex={0}
                                >
                                  {item.name}
                                </Link>
                              </h6>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-lg h6 mb-0 fw-semibold">
                            ${item.price.toFixed(2)}
                          </span>
                        </td>
                        <td>

                          {/* <QuantityControl
                            initialQuantity={item.quantity}
                            onChange={(qty) => {
                              const newQty = Math.max(1, Math.min(99, qty));
                              handleQuantityChange(item.id, newQty);
                            }}
                            disabled={updatingId === item.id || buyingId === item.id}
                          /> */}

                          {/* <QuantityControl
                            initialQuantity={item.quantity}
                            onChange={(qty) => handleQuantityChange(item.id, qty)}
                            disabled={updatingId === item.id || buyingId === item.id}
                          /> */}

                          <QuantityControl
                            initialQuantity={item.quantity}
                            onChange={(qty) => handleQuantityChange(item.id, qty)}
                            disabled={updatingId === item.id || buyingId === item.id}
                          />

                        </td>
                        <td>
                          <span className="text-lg h6 mb-0 fw-semibold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-lg-4">
            <div className="cart__total border border-gray-100 rounded-8 p-24">
              <h6 className="text-xl mb-24">Cart Total</h6>

              <div className="d-flex justify-content-between text-lg text-heading fw-semibold mb-16">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <div className="mb-16">
                <label className="fw-semibold mb-8 d-block">Pay with:</label>
                <select
                  className="form-control"
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                  disabled={placingOrder}
                >
                  <option value={REACT_APP_USDT_ADDRESS}>USDT</option>
                  <option value={REACT_APP_USDC_ADDRESS}>USDC</option>
                </select>
              </div>

              <div className="d-flex justify-content-between text-lg text-heading fw-semibold mb-16">
                <span>Shipping</span>
                <span className="text-sm text-neutral-500 fw-normal">
                  Calculated at checkout
                </span>
              </div>
              <div className="d-flex justify-content-between text-lg text-heading fw-semibold">
                <span>Total</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <div className='my-6'>

                {/* <button
                  onClick={handlePlaceOrder}
                  disabled={placingOrder || items.length === 0 || !contract}
                  className="btn btn-main w-100 py-14 text-lg my-2 mt-4"
                >
                  {placingOrder ? 'Processing Payment...' : 'Place Order'}
                </button> */}

                <button
                  onClick={() => items.length === 1 ? handleBuyNow() : handlePlaceOrder()}
                  disabled={placingOrder || items.length === 0 || !contract}
                  className="btn btn-main w-100 py-14 text-lg my-2 mt-4"
                >
                  {placingOrder ? 'Processing Payment...' : 'Place Order'}
                </button>

              </div>

              {/* {!contract && (
                <button onClick={connectWallet} className="btn btn-gray w-100 mt-12">
                  Connect Wallet
                </button>
              )} */}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CartSection;