import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import QuantityControl from '../helper/QuantityControl';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/api';

const { REACT_APP_USDT_MINT, REACT_APP_USDC_MINT } = process.env;

const CartSection = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const [selectedToken, setSelectedToken] = useState(REACT_APP_USDC_MINT);

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

  useEffect(() => {
    fetchCart();
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

  const handleQuantityChange = async (productId, quantity) => {
    console.log("cart quantity changed", productId, quantity);

    const token = localStorage.getItem('userToken');
    if (!token) {
      navigate('/account');
      return;
    }

    if (updatingId === productId) {
      console.log("Already updating, ignoring duplicate call");
      return;
    }

    setUpdatingId(productId);

    try {
      await axios.post(
        API_ENDPOINTS.CART,
        { productId, quantity },
        { headers: authHeaders() }
      );

      setItems(prevItems =>
        prevItems.map(item =>
          item.id === productId ? { ...item, quantity: quantity } : item
        )
      );

      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      console.error('Update cart failed', err);
      toast.error('Failed to update quantity');
      fetchCart();
    } finally {
      setUpdatingId(null);
    }
  };

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const handleCheckout = () => {
    // Store selected token in localStorage so checkout page can access it
    localStorage.setItem('selectedPaymentToken', selectedToken);
    navigate('/checkout');
  };

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
            className="btn border-gray-300 text-gray-600 bg-white rounded-pill px-24 py-12"
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
                            disabled={updatingId === item.id}
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
                                  className="link text-line-2 hover-text-main-two-600"
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
                          <QuantityControl
                            initialQuantity={item.quantity}
                            onChange={(qty) => handleQuantityChange(item.id, qty)}
                            disabled={updatingId === item.id}
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
                >
                  <option value={REACT_APP_USDT_MINT}>USDT</option>
                  <option value={REACT_APP_USDC_MINT}>USDC</option>
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
                <Link
                  to="/"
                  className="btn w-100 py-14 text-lg my-2 mt-4 border-gray-300 text-gray-600 bg-white"
                  // style={{ backgroundColor: '#6c757d', color: 'white' }}
                >
                  Continue Shopping
                </Link>

                <button
                  onClick={handleCheckout}
                  disabled={items.length === 0}
                  className="btn btn-main-two w-100 py-14 text-lg my-2"

                >
                  Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CartSection;