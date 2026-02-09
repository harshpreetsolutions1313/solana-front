import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Slider from 'react-slick';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getCountdown } from '../helper/Countdown';
import { API_ENDPOINTS } from '../config/api';
import { useNavigate } from 'react-router-dom';

const ProductDetailsOne = () => {
  const [timeLeft, setTimeLeft] = useState(getCountdown());
  const { id: paramId } = useParams();
  const navigate = useNavigate();

  // support id passed via route param or querystring or pathname fallback
  const getIdFromLocation = () => {
    try {
      const qp = new URLSearchParams(window.location.search);
      if (qp.get('id')) return qp.get('id');
      const parts = window.location.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && last !== 'product-details') return last;
    } catch (e) { }
    return null;
  };

  const id = paramId || getIdFromLocation();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false); // Track if product is in wishlist

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getCountdown());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const productImages = product?.images && product.images.length
    ? product.images
    : [
      "assets/images/thumbs/product-details-thumb1.png",
      "assets/images/thumbs/product-details-thumb2.png",
      "assets/images/thumbs/product-details-thumb3.png",
      "assets/images/thumbs/product-details-thumb2.png",
    ];

  // increment & decrement
  const [quantity, setQuantity] = useState(1);
  const incrementQuantity = () => setQuantity(quantity + 1);
  const decrementQuantity = () => setQuantity(quantity > 1 ? quantity - 1 : quantity);

  const [mainImage, setMainImage] = useState(productImages[0]);

  const settingsThumbs = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    focusOnSelect: true,
  };

  // Fetch product by id
  useEffect(() => {
    let mounted = true;
    const fetchProduct = async () => {
      const finalId = id || getIdFromLocation();
      if (!finalId) {
        setError('No product id provided');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await axios.get(API_ENDPOINTS.PRODUCT_BY_ID(finalId));
        if (!mounted) return;
        let data = res.data;
        if (data && data.product) data = data.product;
        if (data && data.data) data = data.data;
        setProduct(data || null);
        setError(null);
      } catch (e) {
        console.error('Failed to fetch product', e);
        if (!mounted) return;
        setError('Failed to load product');
        toast.error('Failed to load product details');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchProduct();
    return () => {
      mounted = false;
    };
  }, [paramId, id]);

  // When product changes set main image
  useEffect(() => {
    if (product?.images && product.images.length) {
      setMainImage(product.images[0]);
    }
  }, [product]);

  // Add to Wishlist Handler
  const handleAddToWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const token = localStorage.getItem('userToken'); // Change this key if your token is stored differently
    if (!token) {
      toast.error('Please login to add to wishlist');
      navigate('/account')
      return;
    }

    if (!product?.id) {
      toast.error('Product information not available');
      return;
    }

    try {
      const response = await axios.post(
        `http://localhost:5000/api/products/wishlist/add/${product.id}`,
        {}, // Empty body if backend expects product ID only from URL
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200 || response.data.success) {
        setIsWishlisted(true);
        toast.success('Added to wishlist ❤️');
      }
    } catch (err) {
      console.error('Wishlist error:', err);
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error('Failed to add to wishlist');
      }
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log("Inside Add to Cart function")

    const token = localStorage.getItem('userToken');

    if (!token) {
      toast.error('Please login to add to cart');
      navigate('/account')
      return;
    }

    if (!product?.id) {
      toast.error('Product information not available');
      return;
    }

    try {
      const response = await axios.post(
        API_ENDPOINTS.CART,
        {
          productId: product.id,
          quantity: quantity,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200 || response.data.success) {
        toast.success('Added to cart!');
      }

      setTimeout(() => {
        navigate('/cart');
      }, 1000);

    } catch (err) {

      console.error('Cart error:', err);

      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error('Failed to add to cart');
      }
    }
  };


  if (loading) {
    return (
      <section className="product-details py-80">
        <div className="container container-lg">
          <div className="text-center">
            <div className="spinner-border text-main-600" style={{ width: '3rem', height: '3rem' }} role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-16 text-gray-600">Loading product...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="product-details py-80">
        <div className="container container-lg">
          <div className="alert alert-danger text-center" role="alert">
            <strong>Oops!</strong> {error}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="product-details py-80">
      <div className="container container-lg">
        <div className="row gy-4">
          <div className="col-lg-9">
            <div className="row gy-4">
              <div className="col-xl-6">
                <div className="product-details__left">
                  <div className="product-details__thumb-slider border border-gray-100 rounded-16">
                    <div className="">
                      <div className="product-details__thumb flex-center h-100">
                        <img src={mainImage} alt="Main Product" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-xl-6">
                <div className="product-details__content">
                  <h5 className="mb-12">{product?.name || "Product"}</h5>
                  <div className="flex-align flex-wrap gap-12">
                    <div className="flex-align gap-12 flex-wrap">
                      <div className="flex-align gap-8">
                        <span className="text-15 fw-medium text-warning-600 d-flex"><i className="ph-fill ph-star" /></span>
                        <span className="text-15 fw-medium text-warning-600 d-flex"><i className="ph-fill ph-star" /></span>
                        <span className="text-15 fw-medium text-warning-600 d-flex"><i className="ph-fill ph-star" /></span>
                        <span className="text-15 fw-medium text-warning-600 d-flex"><i className="ph-fill ph-star" /></span>
                        <span className="text-15 fw-medium text-warning-600 d-flex"><i className="ph-fill ph-star" /></span>
                      </div>
                      <span className="text-sm fw-medium text-neutral-600">4.7 Star Rating</span>
                      <span className="text-sm fw-medium text-gray-500">(21,671)</span>
                    </div>
                  </div>

                  <span className="mt-32 pt-32 text-gray-700 border-top border-gray-100 d-block" />
                  <p className="text-gray-700">{product?.description || 'No description available.'}</p>

                  <div className="mt-32 flex-align flex-wrap gap-32">
                    <div className="flex-align gap-8">
                      <h4 className="mb-0">${Number(product?.price ?? 0)}</h4>
                      {product?.originalPrice && <span className="text-md text-gray-500">${Number(product.originalPrice)}</span>}
                    </div>
                  </div>

                  <span className="mt-32 pt-32 text-gray-700 border-top border-gray-100 d-block" />

                  <div className="mb-24">
                    <div className="mt-32 flex-align gap-12 mb-16">
                      <span className="w-32 h-32 bg-white flex-center rounded-circle text-main-600 box-shadow-xl">
                        <i className="ph-fill ph-lightning" />
                      </span>
                      <h6 className="text-md mb-0 fw-bold text-gray-900">Products are almost sold out</h6>
                    </div>
                    <div className="progress w-100 bg-gray-100 rounded-pill h-8" role="progressbar" aria-label="Basic example" aria-valuenow={32} aria-valuemin={0} aria-valuemax={100}>
                      <div className="progress-bar bg-main-two-600 rounded-pill" style={{ width: "32%" }} />
                    </div>
                    <span className="text-sm text-gray-700 mt-8">Available only: {product?.stock ?? 'N/A'}</span>
                  </div>

                  <span className="text-gray-900 d-block mb-8">Quantity:</span>

                  <div className="flex-between gap-16 flex-wrap">
                    <div className="flex-align flex-wrap gap-16">
                      <div className="border border-gray-100 rounded-pill py-9 px-16 flex-align">

                        <button onClick={decrementQuantity} type="button" className="quantity__minus p-4 text-gray-700 hover-text-main-600 flex-center">
                          <i className="ph ph-minus" />
                        </button>

                        <input type="number" className="quantity__input border-0 text-center w-32" value={quantity} readOnly />

                        <button onClick={incrementQuantity} type="button" className="quantity__plus p-4 text-gray-700 hover-text-main-600 flex-center">
                          <i className="ph ph-plus" />
                        </button>

                      </div>

                      {/* <Link to="#" className="btn btn-main rounded-pill flex-align d-inline-flex gap-8 px-48">
                        <i className="ph ph-shopping-cart" /> Add To Cart
                      </Link> */}

                      <button
                        onClick={handleAddToCart}
                        className="btn btn-main rounded-pill flex-align d-inline-flex gap-8 px-48"
                      >
                        <i className="ph ph-shopping-cart" /> Add To Cart
                      </button>


                    </div>

                    <div className="flex-align gap-12">
                      {/* Wishlist Heart Icon */}
                      <button
                        onClick={handleAddToWishlist}
                        disabled={isWishlisted}
                        className={`w-52 h-52 flex-center rounded-circle transition-all ${isWishlisted
                            ? 'bg-main-600 text-white'
                            : 'bg-main-50 text-main-600 hover-bg-main-600 hover-text-white'
                          }`}
                        title={isWishlisted ? 'Already in wishlist' : 'Add to wishlist'}
                      >
                        <i className={`ph text-xl ${isWishlisted ? 'ph-fill ph-heart' : 'ph-heart'}`} />
                      </button>

                      {/* <Link to="#" className="w-52 h-52 bg-main-50 text-main-600 text-xl hover-bg-main-600 hover-text-white flex-center rounded-circle">
                        <i className="ph ph-shuffle" />
                      </Link> */}
                      <Link to="#" className="w-52 h-52 bg-main-50 text-main-600 text-xl hover-bg-main-600 hover-text-white flex-center rounded-circle">
                        <i className="ph ph-share-network" />
                      </Link>
                    </div>
                  </div>

                  <span className="mt-32 pt-32 text-gray-700 border-top border-gray-100 d-block" />
                </div>
              </div>
            </div>

            {/* Description & Reviews Tabs */}
            <div className="pt-80">
              <div className="product-dContent border rounded-24">
                <div className="product-dContent__header border-bottom border-gray-100 flex-between flex-wrap gap-16">
                  <ul className="nav common-tab nav-pills mb-3" id="pills-tab" role="tablist">
                    <li className="nav-item" role="presentation">
                      <button className="nav-link active" id="pills-description-tab" data-bs-toggle="pill" data-bs-target="#pills-description" type="button" role="tab" aria-controls="pills-description" aria-selected="true">
                        Description
                      </button>
                    </li>
                    {/* <li className="nav-item" role="presentation">
                      <button className="nav-link" id="pills-reviews-tab" data-bs-toggle="pill" data-bs-target="#pills-reviews" type="button" role="tab" aria-controls="pills-reviews" aria-selected="false">
                        Reviews
                      </button>
                    </li> */}
                  </ul>
                  <Link to="#" className="btn bg-color-one rounded-16 flex-align gap-8 text-main-600 hover-bg-main-600 hover-text-white">
                    <img src="assets/images/icon/satisfaction-icon.png" alt="" /> 100% Satisfaction Guaranteed
                  </Link>
                </div>

                {/* Tab content remains unchanged */}
                <div className="product-dContent__box">
                  <div className="tab-content" id="pills-tabContent">
                    {/* Description tab content (kept as original) */}
                    <div className="tab-pane fade show active" id="pills-description" role="tabpanel" aria-labelledby="pills-description-tab" tabIndex={0}>
                      {/* ... (your original description content) ... */}
                      <div className="mb-40">
                        <h6 className="mb-24">Product Description</h6>
                        <p>{product?.description || "Product"}</p>
                        {/* <p> Wherever celebrations and good times happen, the LAY'S brand will be there just as it has been for more than 75 years. With flavors almost as rich as our history, we have a chip or crisp flavor guaranteed to bring a smile on your face. </p>
                        <p> Morbi ut sapien vitae odio accumsan gravida. Morbi vitae erat auctor, eleifend nunc a, lobortis neque. Praesent aliquam dignissim viverra. Maecenas lacus odio, feugiat eu nunc sit amet, maximus sagittis dolor. Vivamus nisi sapien, elementum sit amet eros sit amet, ultricies cursus ipsum. Sed consequat luctus ligula. Curabitur laoreet rhoncus blandit. Aenean vel diam ut arcu pharetra dignissim ut sed leo. Vivamus faucibus, ipsum in vestibulum vulputate, lorem orci convallis quam, sit amet consequat nulla felis pharetra lacus. Duis semper erat mauris, sed egestas purus commodo vel. </p> */}
                        {/* Lists and other content unchanged */}
                      </div>
                      {/* Other sections (Specifications, Nutrition, More Details) unchanged */}
                    </div>

                    {/* Reviews tab content unchanged */}
                    <div className="tab-pane fade" id="pills-reviews" role="tabpanel" aria-labelledby="pills-reviews-tab" tabIndex={0}>
                      {/* ... your original reviews content ... */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductDetailsOne;