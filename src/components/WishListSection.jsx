import React, { useState, useEffect } from "react";
// Assuming you are using react-router-dom for navigation
import { Link } from "react-router-dom";
import { API_ENDPOINTS } from '../config/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';


const WishListSection = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Function to fetch wishlist items from the API
  const fetchWishlistItems = async () => {
    // Retrieve the token from localStorage using the key you specified
    const jwtToken = localStorage.getItem('userToken');

    if (!jwtToken) {
      setError('User not authenticated. Please log in.');
      setLoading(false);
      return; // Exit if no token is found
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/products/wishlist', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`, // Attach the JWT token
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        // Handle specific error codes if necessary (e.g., 401 Unauthorized)
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch wishlist items');
      }

      const data = await response.json();
      
      setWishlistItems(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlistItems();
  }, []);

  // Placeholder functions for actions (You will need to implement API calls here)
  // const handleRemoveItem = (productId) => {
  //   console.log(`Removing item with ID: ${productId}`);
  //   // Example implementation idea:
  //   const jwtToken = localStorage.getItem('userToken');
  //   fetch(`http://localhost:5000/api/products/wishlist/remove/${productId}`, { 
  //     method: 'POST', 
  //     headers: { 'Authorization': `Bearer ${jwtToken}` } 
  //   }).then(() => fetchWishlistItems()); // Re-fetch list after deletion
  // };

  const handleRemoveItem = async (productId) => {
    const jwtToken = localStorage.getItem('userToken');
    try {
      await fetch(`http://localhost:5000/api/products/wishlist/remove/${productId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}` },
      });
      fetchWishlistItems(); // Re-fetch wishlist after removal
      // toast.success('Item removed from wishlist!');
    } catch (err) {
      toast.error('Failed to remove item from wishlist');
    }
  };

  // const handleAddToCart = async (productId) => {
  //   const jwtToken = localStorage.getItem('userToken');
  //   if (!jwtToken) {
  //     setError('User not authenticated. Please log in.');
  //     return;
  //   }
  
  //   try {
  //     const response = await fetch(API_ENDPOINTS.CART, {
  //       method: 'POST',
  //       headers: {
  //         'Authorization': `Bearer ${jwtToken}`,
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         productId: productId,
  //         quantity: 1, // Default quantity, you can adjust as needed
  //       }),
  //     });
  
  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.message || 'Failed to add item to cart');
  //     }
  
  //     const data = await response.json();
  //     alert('Item added to cart successfully!'); // Or use a toast/notification
  //     // Optionally, you can update the UI or refetch the wishlist
  //   } catch (err) {
  //     setError(err.message);
  //   }
  // };

  const handleAddToCart = async (productId) => {
    const jwtToken = localStorage.getItem('userToken');
    if (!jwtToken) {
      toast.error('User not authenticated. Please log in.');
      return;
    }
  
    try {
      // Add to cart
      const cartResponse = await fetch(API_ENDPOINTS.CART, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: productId,
          quantity: 1,
        }),
      });
  
      if (!cartResponse.ok) {
        const errorData = await cartResponse.json();
        throw new Error(errorData.message || 'Failed to add item to cart');
      }
  
      // Remove from wishlist
      await handleRemoveItem(productId);
      toast.success('Item added to cart and removed from wishlist!');

      setTimeout(() => {
        navigate('/cart');
      }, 1000);

    } catch (err) {
      toast.error(err.message);
    }
  };
  

  if (loading) {
    return <section className='cart py-80'><div className="container container-lg">Loading wishlist...</div></section>;
  }

  if (error) {
    return <section className='cart py-80'><div className="container container-lg">Error: {error}</div></section>;
  }

  if (wishlistItems.length === 0) {
    return <section className='cart py-80'><div className="container container-lg">Your wishlist is empty.</div></section>;
  }

  return (
    <section className='cart py-80'>
      <div className='container container-lg'>
        <div className='row gy-4'>
          <div className='col-lg-11'>
            <div className='cart-table border border-gray-100 rounded-8'>
              <div className='overflow-x-auto scroll-sm scroll-sm-horizontal'>
                <table className='table rounded-8 overflow-hidden'>
                  <thead>
                    <tr className='border-bottom border-neutral-100'>
                      <th className='h6 mb-0 text-lg fw-bold px-40 py-32 border-end border-neutral-100'> Delete </th>
                      <th className='h6 mb-0 text-lg fw-bold px-40 py-32 border-end border-neutral-100'> Product Name </th>
                      <th className='h6 mb-0 text-lg fw-bold px-40 py-32 border-end border-neutral-100'> Unit Price </th>
                      <th className='h6 mb-0 text-lg fw-bold px-40 py-32 border-end border-neutral-100'> Stock Status </th>
                      <th className='h6 mb-0 text-lg fw-bold px-40 py-32' />
                    </tr>
                  </thead>
                  <tbody>
                    {/* Map over the fetched wishlist items to render rows */}
                    {wishlistItems.map((item) => (
                      <tr key={item.id}>
                        <td className='px-40 py-32 border-end border-neutral-100'>
                          <button
                            type='button'
                            className='remove-tr-btn flex-align gap-12 hover-text-danger-600'
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <i className='ph ph-x-circle text-2xl d-flex' /> Remove
                          </button>
                        </td>
                        <td className='px-40 py-32 border-end border-neutral-100'>
                          <div className='table-product d-flex align-items-center gap-24'>
                            <Link
                              to={`/product-details/${item.id}`}
                              className='table-product__thumb border border-gray-100 rounded-8 flex-center'
                            >
                              {/* Use the first image URL from the product data */}
                              <img src={item.images[0]} alt={item.name} />
                            </Link>
                            <div className='table-product__content text-start'>
                              <h6 className='title text-lg fw-semibold mb-8'>
                                <Link to={`/product-details/${item.id}`} className='link text-line-2' tabIndex={0}>
                                  {item.name}
                                </Link>
                              </h6>
                              {/* Reviews/tags logic is omitted as it's not in the API data */}
                              <div className='flex-align gap-16'>
                                <span className="text-sm text-neutral-600">{item.description}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className='px-40 py-32 border-end border-neutral-100'>
                          <span className='text-lg h6 mb-0 fw-semibold'> ${item.price.toFixed(2)} </span>
                        </td>
                        <td className='px-40 py-32 border-end border-neutral-100'>
                          <span className='text-lg h6 mb-0 fw-semibold' style={{ color: item.stock > 0 ? 'green' : 'red' }}>
                            {item.stock > 0 ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </td>
                        <td className='px-40 py-32'>
                          <button
                            className='btn btn-main-two rounded-8 px-64'
                            onClick={() => handleAddToCart(item.id)}
                            disabled={item.stock === 0}
                          >
                            Add To Cart <i className='ph ph-shopping-cart' />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WishListSection;
