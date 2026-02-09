import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const PurchasedProductsSection = () => {
  const [purchasedItems, setPurchasedItems] = useState([]);
  const [orderStats, setOrderStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getAuthHeaders = () => {
    const jwtToken = localStorage.getItem('userToken');
    return {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchOrderStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/orders/user/stats', {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order statistics');
      }

      const result = await response.json();
      setOrderStats(result.data);
    } catch (err) {
      console.error('Error fetching order stats:', err);
    }
  };

  const fetchPurchasedProducts = async () => {
    const jwtToken = localStorage.getItem('userToken');

    if (!jwtToken) {
      setError('User not authenticated. Please log in.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/users/purchased-products', {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch purchased products');
      }

      const data = await response.json();

      // Sort by most recent first (trackedAt desc)
      const sortedProducts = (data.products || []).sort((a, b) => {
        return new Date(b.trackedAt) - new Date(a.trackedAt);
      });

      setPurchasedItems(sortedProducts);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderStats();
    fetchPurchasedProducts();
  }, []);

  const getStatusBadgeClass = (status) => {
    const statusLower = status?.toLowerCase() || '';
    switch (statusLower) {
      case 'delivered':
        return 'bg-success-50 text-success-600';
      case 'processing':
        return 'bg-info-50 text-info-600';
      case 'pending':
        return 'bg-warning-50 text-warning-600';
      case 'cancelled':
        return 'bg-danger-50 text-danger-600';
      default:
        return 'bg-neutral-50 text-neutral-600';
    }
  };

  const formatStatus = (status) => {
    if (!status) return 'N/A';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  if (loading) {
    return (
      <section className='cart py-80'>
        <div className="container container-lg">
          <div className="text-center text-gray-600">Loading your orders...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className='cart py-80'>
        <div className="container container-lg">
          <div className="alert alert-danger text-center">Error: {error}</div>
        </div>
      </section>
    );
  }

  return (
    <section className='cart py-30'>
      <div className='container container-lg'>
        {/* Order Statistics Cards */}
        {orderStats && (
          <div className="row g-4 mb-40">
            <div className="col-xxl-3 col-sm-6">
              <div className="border border-gray-100 rounded-8 p-24 d-flex align-items-center gap-16">
                <div className="w-64 h-64 rounded-circle bg-main-50 flex-center flex-shrink-0">
                  <i className="ph ph-shopping-cart text-main-600 text-32"></i>
                </div>
                <div>
                  <span className="text-neutral-600 d-block mb-4">Total Orders</span>
                  <h4 className="mb-0">{orderStats.totalOrders}</h4>
                </div>
              </div>
            </div>

            <div className="col-xxl-3 col-sm-6">
              <div className="border border-gray-100 rounded-8 p-24 d-flex align-items-center gap-16">
                <div className="w-64 h-64 rounded-circle bg-warning-50 flex-center flex-shrink-0">
                  <i className="ph ph-clock text-warning-600 text-32"></i>
                </div>
                <div>
                  <span className="text-neutral-600 d-block mb-4">Pending Orders</span>
                  <h4 className="mb-0">{orderStats.pending}</h4>
                </div>
              </div>
            </div>

            <div className="col-xxl-3 col-sm-6">
              <div className="border border-gray-100 rounded-8 p-24 d-flex align-items-center gap-16">
                <div className="w-64 h-64 rounded-circle bg-info-50 flex-center flex-shrink-0">
                  <i className="ph ph-package text-info-600 text-32"></i>
                </div>
                <div>
                  <span className="text-neutral-600 d-block mb-4">Processing Order</span>
                  <h4 className="mb-0">{orderStats.processing}</h4>
                </div>
              </div>
            </div>

            <div className="col-xxl-3 col-sm-6">
              <div className="border border-gray-100 rounded-8 p-24 d-flex align-items-center gap-16">
                <div className="w-64 h-64 rounded-circle bg-success-50 flex-center flex-shrink-0">
                  <i className="ph ph-check-circle text-success-600 text-32"></i>
                </div>
                <div>
                  <span className="text-neutral-600 d-block mb-4">Complete Orders</span>
                  <h4 className="mb-0">{orderStats.delivered}</h4>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orders Table */}
        {purchasedItems.length === 0 ? (
          <div className="text-center py-5">
            <h5 className="mb-3">You haven't purchased any products yet.</h5>
            <Link to="/" className="btn btn-main-two rounded-pill px-32 py-12">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className='row gy-4'>
            <div className='col-lg-12'>
              <div className='cart-table border border-gray-100 rounded-8'>
                <div className='overflow-x-auto scroll-sm scroll-sm-horizontal'>
                  <table className='table rounded-8 overflow-hidden'>
                    <thead>
                      <tr className='border-bottom border-neutral-100'>
                        <th className='h6 mb-0 text-lg fw-bold px-40 py-32 border-end border-neutral-100'>Order ID</th>
                        <th className='h6 mb-0 text-lg fw-bold px-40 py-32 border-end border-neutral-100'>Product</th>
                        <th className='h6 mb-0 text-lg fw-bold px-40 py-32 border-end border-neutral-100'>Amount Paid</th>
                        <th className='h6 mb-0 text-lg fw-bold px-40 py-32 border-end border-neutral-100'>Payment</th>
                        <th className='h6 mb-0 text-lg fw-bold px-40 py-32 border-end border-neutral-100'>Status</th>
                        <th className='h6 mb-0 text-lg fw-bold px-40 py-32 border-end border-neutral-100'>Purchase Date</th>
                        <th className='h6 mb-0 text-lg fw-bold px-40 py-32'>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchasedItems.map((item, index) => (
                        <tr key={index}>
                          <td className='px-40 py-32 border-end border-neutral-100'>
                            <span className='text-lg h6 mb-0 fw-semibold'>#{item.orderId}</span>
                          </td>
                          <td className='px-40 py-32 border-end border-neutral-100'>
                            <div className='table-product d-flex align-items-center gap-24'>
                              <Link
                                to={`/product-details/${item.productId}`}
                                className='table-product__thumb border border-gray-100 rounded-8 flex-center'
                              >
                                <img
                                  src={item.productImages?.[0] || '/images/no-image.svg'}
                                  alt={item.productName}
                                  onError={(e) => {
                                    e.target.src = '/images/no-image.svg';
                                  }}
                                />
                              </Link>
                              <div className='table-product__content text-start'>
                                <h6 className='title text-lg fw-semibold mb-8'>
                                  <Link
                                    to={`/product-details/${item.productId}`}
                                    className='link text-line-2'
                                  >
                                    {item.productName}
                                  </Link>
                                </h6>
                                <span className="text-xs text-neutral-500 uppercase">
                                  ID: {item.productId}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className='px-40 py-32 border-end border-neutral-100'>
                            <span className='text-lg h6 mb-0 fw-semibold'>
                              {item.amount} {item.token}
                            </span>
                          </td>
                          <td className='px-40 py-32 border-end border-neutral-100'>
                            {item.transactionHash === 'WALLET_INTERNAL' ? (
                              <span className='text-sm text-main-two-600 fw-semibold'>
                                Purchased by Wallet Fund
                              </span>
                            ) : item.transactionHash ? (
                              <a
                                href={`https://nile.tronscan.org/#/transaction/${item.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className='text-sm text-main-two-600 hover-text-decoration-underline'
                              >
                                View Transaction
                              </a>
                            ) : (
                              <span className='text-sm text-gray-600'>-</span>
                            )}
                          </td>
                          <td className='px-40 py-32 border-end border-neutral-100'>
                            <span
                              className={`px-16 py-6 rounded-pill fw-semibold text-sm ${getStatusBadgeClass(item.status)}`}
                            >
                              {formatStatus(item.status)}
                            </span>
                          </td>
                          <td className='px-40 py-32 border-end border-neutral-100'>
                            <span className='text-lg h6 mb-0 fw-semibold'>
                              {new Date(item.trackedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </td>
                          <td className='px-40 py-32'>
                            <Link
                              to={`/product-details/${item.productId}`}
                              className='btn btn-main-two rounded-8 px-32 py-12 text-sm'
                            >
                              View Product <i className='ph ph-arrow-right' />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PurchasedProductsSection;