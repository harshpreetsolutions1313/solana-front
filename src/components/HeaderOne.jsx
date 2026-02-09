import React, { useCallback, useEffect, useRef, useState } from "react";
import query from "jquery";
import { Link, useNavigate } from "react-router-dom";
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import toast from 'react-hot-toast';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';

const HeaderOne = () => {
  const [scroll, setScroll] = useState(false);

  // Solana Wallet - Direct Phantom connection
  const { publicKey, connected, disconnect, wallets, select, connect } = useWallet();
  const walletAddress = publicKey?.toBase58();
  const isConnected = connected;

  // Function to connect directly to Phantom
  const connectPhantomWallet = useCallback(async () => {
    try {
      // Find Phantom wallet from available wallets
      const phantomWallet = wallets.find(
        wallet => wallet.adapter.name === 'Phantom'
      );

      if (!phantomWallet) {
        toast.error('Phantom wallet not found. Please install Phantom extension.');
        // Redirect to Phantom installation
        window.open('https://phantom.app/', '_blank');
        return;
      }

      // Check if Phantom is installed
      if (phantomWallet.readyState === WalletReadyState.NotDetected) {
        toast.error('Phantom wallet is not installed. Redirecting to download...');
        window.open('https://phantom.app/', '_blank');
        return;
      }

      // Select and connect to Phantom
      select(phantomWallet.adapter.name);
      
      // Small delay to ensure wallet is selected
      setTimeout(async () => {
        try {
          await connect();
        } catch (err) {
          console.error('Connection error:', err);
          if (err.message?.includes('User rejected')) {
            toast.error('Connection rejected by user');
          } else {
            // toast.error('Failed to connect wallet');
          }
        }
      }, 100);

    } catch (error) {
      console.error('Error connecting to Phantom:', error);
      toast.error('Failed to connect to Phantom wallet');
    }
  }, [wallets, select, connect]);

  useEffect(() => {
    window.onscroll = () => {
      if (window.pageYOffset < 150) {
        setScroll(false);
      } else if (window.pageYOffset > 150) {
        setScroll(true);
      }
      return () => (window.onscroll = null);
    };
    const selectElement = query(".js-example-basic-single");
    selectElement.select2();

    return () => {
      if (selectElement.data("select2")) {
        selectElement.select2("destroy");
      }
    };
  }, []);

  // Set the default language
  const [selectedLanguage, setSelectedLanguage] = useState("Eng");
  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
  };

  // Set the default currency
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const handleCurrencyChange = (currency) => {
    setSelectedCurrency(currency);
  };

  // Mobile menu support
  const [menuActive, setMenuActive] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const handleMenuClick = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const handleMenuToggle = () => {
    setMenuActive(!menuActive);
  };

  // Search control support
  const [activeSearch, setActiveSearch] = useState(false);
  const handleSearchToggle = () => {
    setActiveSearch(!activeSearch);
  };

  // category control support
  const [activeCategory, setActiveCategory] = useState(false);
  const handleCategoryToggle = () => {
    setActiveCategory(!activeCategory);
  };
  const [activeIndexCat, setActiveIndexCat] = useState(null);
  const handleCatClick = (index) => {
    setActiveIndexCat(activeIndexCat === index ? null : index);
  };

  // Mobile category dropdown
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false);
  const mobileCategoryRef = useRef(null);
  
  // Auth / account dropdown
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return !!localStorage.getItem('userToken');
    } catch (e) {
      return false;
    }
  });
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const walletButtonRef = useRef(null);

  // Wallet support
  const [showWalletModal, setShowWalletModal] = useState(false);
  const walletModalRef = useRef(null);
  const [preferredToken, setPreferredToken] = useState(() => {
    try { return localStorage.getItem('preferredToken') || 'USDT'; } catch (e) { return 'USDT'; }
  });

  // Cart support
  const [cartItems, setCartItems] = useState([]);
  const [cartMenuOpen, setCartMenuOpen] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const cartMenuRef = useRef(null);

  const selectPreferredToken = (token) => {
    setPreferredToken(token);
    try { localStorage.setItem('preferredToken', token); window.preferredToken = token; window.dispatchEvent(new Event('prefChanged')); } catch (e) { }
  };

  const normalizeCartItems = (cartEntries = []) => {
    return cartEntries
      .map((entry) => {
        const product = entry.product || {};
        const id = product.id || entry.productId || '';
        if (!id) return null;

        return {
          id,
          name: (product.name || 'Product').trim(),
          price: Number(product.price || 0),
          quantity: Number(entry.quantity || 1),
          image:
            (product.images && product.images.length > 0 && product.images[0]) ||
            '/images/no-image.svg',
        };
      })
      .filter(Boolean);
  };

  const authHeaders = () => {
    const token = localStorage.getItem('userToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchCartItems = useCallback(async () => {
    if (!localStorage.getItem('userToken')) {
      setCartItems([]);
      return;
    }

    setCartLoading(true);

    try {
      const res = await axios.get(API_ENDPOINTS.CART, {
        headers: authHeaders(),
      });

      const payload = res.data;
      const cartArray = Array.isArray(payload?.cart) ? payload.cart : [];
      const normalizedItems = normalizeCartItems(cartArray);

      setCartItems(normalizedItems);
    } catch (e) {
      console.error('Failed to load cart', e);
      setCartItems([]);
    } finally {
      setCartLoading(false);
    }
  }, []);

  const handleAccountButtonClick = e => {
    e.stopPropagation()

    // 🚫 If not logged in → go directly to login page
    if (!isLoggedIn) {
      navigate('/account') // or '/login' if that is your login route
      return
    }

    // ✅ If logged in → open dropdown
    toggleAccountMenu()
  }

  // Search state
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Categories state (for secondary navbar AND search dropdown)
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    if (!searchQuery && !selectedCategory) return;

    const params = new URLSearchParams();
    if (selectedCategory) params.set("category", selectedCategory);
    if (searchQuery) params.set("q", searchQuery);

    navigate(`/shop?${params.toString()}`);
    setShowSearchDropdown(false);
  };

  useEffect(() => {
    let mounted = true;
    const fetchCats = async () => {
      setCategoriesLoading(true);
      try {
        const res = await axios.get(API_ENDPOINTS.CATEGORY_DETAILS);
        const data = Array.isArray(res.data) ? res.data : [];
        const map = new Map();
        data.forEach(item => {
          const raw = item.category || '';
          const key = raw.toLowerCase().trim();
          if (!key) return;
          if (!map.has(key)) map.set(key, { category: raw, imageUrl: item.imageUrl, count: item.count || 0 });
          else {
            const cur = map.get(key);
            cur.count = (cur.count || 0) + (item.count || 0);
            if (!cur.imageUrl && item.imageUrl) cur.imageUrl = item.imageUrl;
            map.set(key, cur);
          }
        });
        if (mounted) setCategories(Array.from(map.values()));
      } catch (e) {
        console.error('Failed to load categories for header', e);
        if (mounted) setCategories([]);
      } finally {
        if (mounted) setCategoriesLoading(false);
      }
    };
    fetchCats();
    return () => { mounted = false; };
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    const id = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const res = await axios.get(API_ENDPOINTS.PRODUCT_SEARCH(searchQuery));
        if (!cancelled) {
          setSearchResults(Array.isArray(res.data) ? res.data : []);
          setShowSearchDropdown(true);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Search API error', err);
          setSearchError('Search failed');
          setSearchResults([]);
          setShowSearchDropdown(false);
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 300);

    return () => { cancelled = true; clearTimeout(id); };
  }, [searchQuery]);

  useEffect(() => {
    const syncLoginState = () => {
      try {
        setIsLoggedIn(!!localStorage.getItem('userToken'));
      } catch (e) {
        setIsLoggedIn(false);
      }
    };
    const handleStorage = (event) => {
      if (event.key === 'userToken') syncLoginState();
    };
    const handleAuthEvent = () => syncLoginState();
    const handleClickOutside = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
      if (cartMenuRef.current && !cartMenuRef.current.contains(event.target)) {
        setCartMenuOpen(false);
      }
    };

    syncLoginState();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('authChanged', handleAuthEvent);
    document.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('authChanged', handleAuthEvent);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchCartItems();
  }, [fetchCartItems, isLoggedIn]);

  useEffect(() => {
    const onCartUpdated = () => fetchCartItems();
    window.addEventListener('cartUpdated', onCartUpdated);
    return () => window.removeEventListener('cartUpdated', onCartUpdated);
  }, [fetchCartItems]);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (cartMenuRef.current && !cartMenuRef.current.contains(e.target)) {
        setCartMenuOpen(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
      if (mobileCategoryRef.current && !mobileCategoryRef.current.contains(e.target)) {
        setMobileCategoryOpen(false);
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  const toggleAccountMenu = () => setAccountMenuOpen((prev) => !prev);
  const toggleCartMenu = () => setCartMenuOpen((prev) => !prev);
  const cartCount = cartItems.length;

  const handleLogout = () => {
    try {
      localStorage.removeItem('userToken');
    } catch (e) {
      console.error('Failed to clear auth token', e);
    }
    setIsLoggedIn(false);
    setAccountMenuOpen(false);
    window.dispatchEvent(new Event('authChanged'));
    navigate('/');
  };

  // Format wallet address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Notify when wallet connects/disconnects
  useEffect(() => {
    if (isConnected && walletAddress) {
      toast.success('Phantom wallet connected successfully!');
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('solanaWalletConnected', { 
        detail: { address: walletAddress } 
      }));
    }
  }, [isConnected, walletAddress]);

  return (
    <>
      <style>
        {`
          @media (max-width: 991px) {
            .header-inner { gap: 8px !important; }
            .form-location-wrapper { flex: 1; min-width: 0; }
            .search-form__input {
              font-size: 14px;
              padding: 10px 40px 10px 12px !important;
            }
            .header-right { flex-shrink: 0; }
            .categories-inner {
              flex-wrap: nowrap;
              -webkit-overflow-scrolling: touch;
            }
            .categories-inner > a { flex-shrink: 0; }
          }
        `}
      </style>
      <div className='overlay' />
      <div
        className={`side-overlay ${(menuActive || activeCategory) && "show"}`}
      />

      {/* ==================== Mobile Menu Start Here ==================== */}
      <div
        className={`mobile-menu scroll-sm d-lg-none d-block ${menuActive && "active"
          }`}
      >
        <button
          onClick={() => {
            handleMenuToggle();
            setActiveIndex(null);
          }}
          type='button'
          className='close-button'
        >
          <i className='ph ph-x' />{" "}
        </button>
        <div className='mobile-menu__inner'>
          <Link to='/' className='mobile-menu__logo'>
            <img src='/assets/images/logo/logo.png' alt='Logoo' />
          </Link>
          <div className='mobile-menu__menu'>
            <ul className='nav-menu flex-align nav-menu--mobile'>
              <li
                onClick={() => handleMenuClick(0)}
                className={`on-hover-item nav-menu__item has-submenu ${activeIndex === 0 ? "d-block" : ""
                  }`}
              >
                <Link to='#' className='nav-menu__link'>
                  Home
                </Link>
                <ul
                  className={`on-hover-dropdown common-dropdown nav-submenu scroll-sm ${activeIndex === 0 ? "open" : ""
                    }`}
                >
                  <li className='common-dropdown__item nav-submenu__item'>
                    <Link
                      to='/'
                      className='common-dropdown__link nav-submenu__link hover-bg-neutral-100'
                      onClick={() => setActiveIndex(null)}
                    >
                      {" "}
                      Home Grocery
                    </Link>
                  </li>
                  <li className='common-dropdown__item nav-submenu__item'>
                    <Link
                      to='/index-two'
                      className='common-dropdown__link nav-submenu__link hover-bg-neutral-100'
                      onClick={() => setActiveIndex(null)}
                    >
                      {" "}
                      Home Electronics
                    </Link>
                  </li>
                  <li className='common-dropdown__item nav-submenu__item'>
                    <Link
                      to='/index-three'
                      className='common-dropdown__link nav-submenu__link hover-bg-neutral-100'
                      onClick={() => setActiveIndex(null)}
                    >
                      Home Fashion
                    </Link>
                  </li>
                </ul>
              </li>

              <li
                onClick={() => handleMenuClick(1)}
                className={`on-hover-item nav-menu__item has-submenu ${activeIndex === 1 ? "d-block" : ""
                  }`}
              >
                <Link to='#' className='nav-menu__link'>
                  Shop
                </Link>
                <ul
                  className={`on-hover-dropdown common-dropdown nav-submenu scroll-sm ${activeIndex === 1 ? "open" : ""
                    }`}
                >
                  <li className='common-dropdown__item nav-submenu__item'>
                    <Link
                      to='/shop'
                      className='common-dropdown__link nav-submenu__link hover-bg-neutral-100'
                      onClick={() => setActiveIndex(null)}
                    >
                      {" "}
                      Shop
                    </Link>
                  </li>
                  <li className='common-dropdown__item nav-submenu__item'>
                    <Link
                      to='/product-details'
                      className='common-dropdown__link nav-submenu__link hover-bg-neutral-100'
                      onClick={() => setActiveIndex(null)}
                    >
                      {" "}
                      Shop Details
                    </Link>
                  </li>
                  <li className='common-dropdown__item nav-submenu__item'>
                    <Link
                      to='/product-details-two'
                      className='common-dropdown__link nav-submenu__link hover-bg-neutral-100'
                      onClick={() => setActiveIndex(null)}
                    >
                      {" "}
                      Shop Details Two
                    </Link>
                  </li>
                </ul>
              </li>

              <li
                onClick={() => handleMenuClick(2)}
                className={`on-hover-item nav-menu__item has-submenu ${activeIndex === 2 ? "d-block" : ""
                  }`}
              >
                <span className='badge-notification bg-warning-600 text-white text-sm py-2 px-8 rounded-4'>
                  New
                </span>
                <Link to='#' className='nav-menu__link'>
                  Pages
                </Link>
                <ul
                  className={`on-hover-dropdown common-dropdown nav-submenu scroll-sm ${activeIndex === 2 ? "open" : ""
                    }`}
                >
                  <li className='common-dropdown__item nav-submenu__item'>
                    <Link
                      to='/cart'
                      className='common-dropdown__link nav-submenu__link hover-bg-neutral-100'
                      onClick={() => setActiveIndex(null)}
                    >
                      {" "}
                      Cart
                    </Link>
                  </li>
                  <li className='common-dropdown__item nav-submenu__item'>
                    <Link
                      to='/wishlist'
                      className='common-dropdown__link nav-submenu__link hover-bg-neutral-100'
                      onClick={() => setActiveIndex(null)}
                    >
                      Wishlist
                    </Link>
                  </li>
                  <li className='common-dropdown__item nav-submenu__item'>
                    <Link
                      to='/checkout'
                      className='common-dropdown__link nav-submenu__link hover-bg-neutral-100'
                      onClick={() => setActiveIndex(null)}
                    >
                      {" "}
                      Checkout{" "}
                    </Link>
                  </li>
                  <li className='common-dropdown__item nav-submenu__item'>
                    <Link
                      to='/become-seller'
                      className='common-dropdown__link nav-submenu__link hover-bg-neutral-100'
                      onClick={() => setActiveIndex(null)}
                    >
                      Become Seller
                    </Link>
                  </li>
                  <li className='common-dropdown__item nav-submenu__item'>
                    <Link
                      to='/account'
                      className='common-dropdown__link nav-submenu__link hover-bg-neutral-100'
                      onClick={() => setActiveIndex(null)}
                    >
                      {" "}
                      Account
                    </Link>
                  </li>
                </ul>
              </li>

              <li
                onClick={() => handleMenuClick(3)}
                className={`on-hover-item nav-menu__item has-submenu ${activeIndex === 3 ? "d-block" : ""
                  }`}
              >
                <span className='badge-notification bg-tertiary-600 text-white text-sm py-2 px-8 rounded-4'>
                  New
                </span>
                <Link to='#' className='nav-menu__link'>
                  Vendors
                </Link>
                <ul
                  className={`on-hover-dropdown common-dropdown nav-submenu scroll-sm ${activeIndex === 3 ? "open" : ""
                    }`}
                >
                  <li className='common-dropdown__item nav-submenu__item'>
                    <Link
                      to='/vendor'
                      className='common-dropdown__link nav-submenu__link hover-bg-neutral-100'
                      onClick={() => setActiveIndex(null)}
                    >
                      Vendors
                    </Link>
                  </li>
                  <li className='common-dropdown__item nav-submenu__item'>
                    <Link
                      to='/vendor-details'
                      className='common-dropdown__link nav-submenu__link hover-bg-neutral-100'
                      onClick={() => setActiveIndex(null)}
                    >
                      Vendor Details
                    </Link>
                  </li>
                  <li className='common-dropdown__item nav-submenu__item'>
                    <Link
                      to='/vendor-two'
                      className='common-dropdown__link nav-submenu__link hover-bg-neutral-100'
                      onClick={() => setActiveIndex(null)}
                    >
                      Vendors Two
                    </Link>
                  </li>
                  <li className='common-dropdown__item nav-submenu__item'>
                    <Link
                      to='/vendor-two-details'
                      className='common-dropdown__link nav-submenu__link hover-bg-neutral-100'
                      onClick={() => setActiveIndex(null)}
                    >
                      Vendors Two Details
                    </Link>
                  </li>
                </ul>
              </li>

              <li
                onClick={() => handleMenuClick(4)}
                className={`on-hover-item nav-menu__item has-submenu ${activeIndex === 4 ? "d-block" : ""
                  }`}
              >
                <Link to='#' className='nav-menu__link'>
                  Blog
                </Link>
                <ul
                  className={`on-hover-dropdown common-dropdown nav-submenu scroll-sm ${activeIndex === 4 ? "open" : ""
                    }`}
                >
                  <li className='common-dropdown__item nav-submenu__item'>
                    <Link
                      to='/blog'
                      className='common-dropdown__link nav-submenu__link hover-bg-neutral-100'
                      onClick={() => setActiveIndex(null)}
                    >
                      {" "}
                      Blog
                    </Link>
                  </li>
                  <li className='common-dropdown__item nav-submenu__item'>
                    <Link
                      to='/blog-details'
                      className='common-dropdown__link nav-submenu__link hover-bg-neutral-100'
                      onClick={() => setActiveIndex(null)}
                    >
                      {" "}
                      Blog Details
                    </Link>
                  </li>
                </ul>
              </li>

              <li className='nav-menu__item'>
                <Link
                  to='/contact'
                  className='nav-menu__link'
                  onClick={() => setActiveIndex(null)}
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      {/* ==================== Mobile Menu End Here ==================== */}

      {/* ======================= Middle Top Start ========================= */}
      <div className='header-top bg-main-600 flex-between'>
        <div className='container container-lg'>
          <div className='flex-between flex-wrap gap-8'>
            <ul className='header-top__right flex-align flex-wrap'>
              <li className='on-hover-item border-right-item border-right-item-sm-space has-submenu arrow-white'>
              </li>
            </ul>
          </div>
        </div>
      </div>
      {/* ======================= Middle Top End ========================= */}

      {/* ======================= Middle Header Start ========================= */}
      <header className='header-middle bg-color-one border-bottom border-gray-100'>
        <style>{`
          .header-middle { position: relative; z-index: 100; }
          .header-right { position: relative; z-index: 2200 !important; }
          .search-dropdown { z-index: 2000 !important; }
          @media (max-width: 991px) {
            .common-dropdown { 
              max-width: calc(100vw - 32px) !important;
              right: 8px !important;
            }
          }
        `}</style>

        <div className='container container-lg'>
          {/* Desktop & Tablet Layout */}
          <nav className='header-inner d-none d-lg-flex align-items-center' style={{position: 'relative', zIndex: 10, justifyContent: 'space-between' }}>

            <Link to='/' className='link' style={{ flexShrink: 0}}>
              <img src='/assets/images/logo/logo.png' alt='Loogo' style={{ height: '40px' }} />
            </Link>

            {/* ================= Search Bar with Category Dropdown ================= */}
            <form
              className="flex-align flex-wrap form-location-wrapper"
              onSubmit={handleSearchSubmit}
              style={{ flex: '0 1 600px', maxWidth: '600px', position: 'relative' }}
            >
              <div className="search-category style-two d-flex h-48 search-form d-sm-flex d-none" style={{ width: '100%' }}>
                <select
                  className="js-example-basic-single border-0"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{ flexShrink: 0 }}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.category} value={cat.category}>
                      {cat.category}
                    </option>
                  ))}
                </select>

                <div className="search-form__wrapper position-relative" style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    className="search-form__input common-input py-13 ps-16 pe-18 border-0"
                    placeholder="Search for a product or brand"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <button
                  type="submit"
                  className="bg-main-two-600 flex-center text-xl text-white"
                  style={{ 
                    flexShrink: 0,
                    width: '48px',
                    height: '48px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className="ph ph-magnifying-glass" />
                </button>
              </div>
            </form>

            <div className='header-right flex-align' style={{ position: 'relative', zIndex: 3500, flexShrink: 0 }}>
              <div className='flex-align flex-wrap gap-12'>
                <div className='d-flex align-items-center gap-8'>
                  {/* Cart Button */}
                  <div ref={cartMenuRef} className='position-relative me-8' style={{ zIndex: 3500 }}>
                    <button
                      type='button'
                      onClick={(e) => { e.stopPropagation(); toggleCartMenu(); }}
                      className='bg-white border border-gray-100 text-gray-800 py-8 px-16 rounded-pill d-inline-flex align-items-center gap-8 shadow-sm'
                      style={{ cursor: 'pointer', position: 'relative', zIndex: 3500 }}
                    >
                      <span className='text-md fw-medium'>Cart</span>
                      <span className='badge rounded-pill bg-main-600 text-white px-8 py-4'>
                        {cartLoading ? '…' : cartCount}
                      </span>
                      <i className={`ph ${cartMenuOpen ? 'ph-caret-up' : 'ph-caret-down'}`} />
                    </button>

                    {cartMenuOpen && (
                      <div
                        className='common-dropdown position-absolute bg-white border border-gray-100 rounded-12 shadow-sm overflow-hidden'
                        style={{
                          minWidth: 260,
                          right: 0,
                          top: 'calc(100% + 8px)',
                          zIndex: 4000,
                          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className='px-16 py-12 border-bottom border-gray-100 d-flex justify-content-between align-items-center'>
                          <span className='fw-semibold text-gray-800'>Cart</span>
                          <span className='text-sm text-gray-500'>{cartLoading ? 'Loading…' : `${cartCount} item${cartCount === 1 ? '' : 's'}`}</span>
                        </div>
                        <div className='max-h-260 overflow-auto'>
                          {cartLoading && (<div className='px-16 py-12 text-sm text-gray-500'>Loading cart...</div>)}
                          {!cartLoading && cartItems.length === 0 && (<div className='px-16 py-12 text-sm text-gray-500'>Your cart is empty</div>)}
                          {!cartLoading && cartItems.slice(0, 5).map((item) => (
                            <div key={item.id} className='px-16 py-10 d-flex align-items-center gap-10 border-bottom border-gray-100'>
                              <img src={item.image || '/images/no-image.svg'} alt={item.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }} onError={(e) => { e.target.src = '/images/no-image.svg'; }} />
                              <div className='flex-grow-1'>
                                <div className='text-sm fw-semibold text-gray-800 text-truncate'>{item.name}</div>
                                <div className='text-xs text-gray-500'>Qty: {item.quantity} · ${Number(item.price || 0).toFixed(2)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className='px-16 py-12'>
                          <Link to='/cart' onClick={() => setCartMenuOpen(false)} className='btn w-100 bg-main-600 text-white py-10 rounded-pill'>Go to Cart</Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Account Button */}
                  <div ref={accountMenuRef} className='position-relative me-8' style={{ zIndex: 3500 }}>
                    <button
                      type='button'
                      onClick={handleAccountButtonClick}
                      className='bg-main-600 text-white py-8 px-12 rounded-pill d-inline-flex align-items-center gap-4'
                      style={{ cursor: 'pointer', position: 'relative', zIndex: 3500 }}
                    >
                      <span className='text-md fw-medium'>{isLoggedIn ? 'Account' : 'Login'}</span>
                      <i className={`ph ${accountMenuOpen ? 'ph-caret-up' : 'ph-caret-down'}`} />
                    </button>

                    {accountMenuOpen && (
                      <div
                        className='common-dropdown position-absolute bg-white border border-gray-100 rounded-12 shadow-sm overflow-hidden'
                        style={{
                          minWidth: 200,
                          right: 0,
                          top: 'calc(100% + 8px)',
                          zIndex: 4000,
                          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link to='/account' className='d-block px-16 py-10 text-gray-800 hover-bg-neutral-100 text-decoration-none' onClick={() => setAccountMenuOpen(false)}>My Profile</Link>
                        <Link to='/purchased-products' className='d-block px-16 py-10 text-gray-800 hover-bg-neutral-100 text-decoration-none' onClick={() => setAccountMenuOpen(false)}>Orders</Link>
                        <Link to='/wishlist' className='d-block px-16 py-10 text-gray-800 hover-bg-neutral-100 text-decoration-none' onClick={() => setAccountMenuOpen(false)}>Wishlist</Link>
                        {isLoggedIn && (<button type='button' className='w-100 text-start px-16 py-10 text-gray-800 hover-bg-neutral-100 bg-transparent border-0' onClick={handleLogout}>Logout</button>)}
                      </div>
                    )}
                  </div>

                  {/* Phantom Wallet Button - Desktop - DIRECT CONNECTION */}
                  <div style={{ position: 'relative' }}>
                    {isConnected ? (
                      <button
                        type='button'
                        onClick={() => disconnect()}
                        className='bg-success-600 text-white py-8 px-16 rounded-pill d-inline-flex align-items-center gap-8'
                        style={{ cursor: 'pointer' }}
                      >
                        <i className='ph ph-wallet' />
                        <span className='text-md fw-medium'>{formatAddress(walletAddress)}</span>
                      </button>
                    ) : (
                      <button
                        type='button'
                        onClick={connectPhantomWallet}
                        className='bg-warning-600 text-white py-8 px-16 rounded-pill d-inline-flex align-items-center gap-8'
                        style={{ cursor: 'pointer' }}
                      >
                        <i className='ph ph-wallet' />
                        <span className='text-md fw-medium'>Connect Phantom</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* ===== MOBILE LAYOUT - Two Rows ===== */}
          <div className='d-lg-none'>
            {/* Row 1: Logo + Cart + Account + Wallet Buttons */}
            <div className='d-flex align-items-center justify-content-between py-2' style={{ gap: '8px' }}>
              {/* Logo - Left Side */}
              <Link to='/' className='d-flex' style={{ flexShrink: 0 }}>
                <img src='/assets/images/logo/logo.png' alt='Logo' style={{ height: '32px', width: 'auto', maxWidth: '100px', objectFit: 'contain' }} />
              </Link>

              {/* Right Side Buttons */}
              <div className='d-flex align-items-center' style={{ gap: '8px', flexShrink: 0 }}>
                {/* Cart Button */}
                <div ref={cartMenuRef} className='position-relative'>
                  <button
                    type='button'
                    onClick={(e) => { e.stopPropagation(); toggleCartMenu(); }}
                    className='bg-white border border-gray-100 text-gray-800 py-2 px-3 rounded-pill d-inline-flex align-items-center gap-2 shadow-sm'
                    style={{ fontSize: '14px', minHeight: '40px', cursor: 'pointer' }}
                  >
                    <i className='ph ph-shopping-cart' style={{ fontSize: '18px' }} />
                    <span className='badge rounded-pill bg-main-600 text-white' style={{ fontSize: '11px', padding: '3px 7px' }}>
                      {cartLoading ? '…' : cartCount}
                    </span>
                  </button>

                  {cartMenuOpen && (
                    <div
                      className='common-dropdown position-absolute bg-white border border-gray-100 rounded-3 shadow-sm overflow-hidden'
                      style={{
                        minWidth: '280px',
                        maxWidth: 'calc(100vw - 40px)',
                        right: 0,
                        top: '100%',
                        marginTop: '8px',
                        zIndex: 9999,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className='px-3 py-2 border-bottom border-gray-100 d-flex justify-content-between align-items-center'>
                        <span className='fw-semibold text-gray-800' style={{ fontSize: '14px' }}>Cart</span>
                        <span className='text-gray-500' style={{ fontSize: '12px' }}>
                          {cartLoading ? 'Loading…' : `${cartCount} item${cartCount === 1 ? '' : 's'}`}
                        </span>
                      </div>
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {cartLoading && (
                          <div className='px-3 py-2 text-gray-500' style={{ fontSize: '13px' }}>Loading cart...</div>
                        )}
                        {!cartLoading && cartItems.length === 0 && (
                          <div className='px-3 py-2 text-gray-500' style={{ fontSize: '13px' }}>Your cart is empty</div>
                        )}
                        {!cartLoading && cartItems.slice(0, 5).map((item) => (
                          <div key={item.id} className='px-3 py-2 d-flex align-items-center gap-2 border-bottom border-gray-100'>
                            <img
                              src={item.image || '/images/no-image.svg'}
                              alt={item.name}
                              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }}
                              onError={(e) => { e.target.src = '/images/no-image.svg'; }}
                            />
                            <div className='flex-grow-1' style={{ minWidth: 0 }}>
                              <div className='fw-semibold text-gray-800 text-truncate' style={{ fontSize: '13px' }}>{item.name}</div>
                              <div className='text-gray-500' style={{ fontSize: '11px' }}>Qty: {item.quantity} · ${Number(item.price || 0).toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className='px-3 py-2'>
                        <Link
                          to='/cart'
                          onClick={() => setCartMenuOpen(false)}
                          className='btn w-100 bg-main-600 text-white rounded-pill'
                          style={{ padding: '8px', fontSize: '13px' }}
                        >
                          Go to Cart
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Account Button */}
                <div ref={accountMenuRef} className='position-relative'>
                  <button
                    type='button'
                    onClick={handleAccountButtonClick}
                    className='bg-main-600 text-white py-2 px-3 rounded-pill d-inline-flex align-items-center gap-2'
                    style={{ fontSize: '14px', minHeight: '40px' }}
                  >
                    <i className='ph ph-user' style={{ fontSize: '18px' }} />
                    <i className={`ph ${accountMenuOpen ? 'ph-caret-up' : 'ph-caret-down'}`} style={{ fontSize: '14px' }} />
                  </button>

                  {accountMenuOpen && (
                    <div
                      className='common-dropdown position-absolute bg-white border border-gray-100 rounded-3 shadow-sm overflow-hidden'
                      style={{
                        minWidth: '180px',
                        right: 0,
                        top: '100%',
                        marginTop: '8px',
                        zIndex: 9999,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                      }}
                    >
                      <Link
                        to='/account'
                        className='d-block px-3 py-2 text-gray-800 hover-bg-neutral-100 text-decoration-none'
                        onClick={() => setAccountMenuOpen(false)}
                        style={{ fontSize: '13px' }}
                      >
                        My Profile
                      </Link>
                      <Link
                        to='/purchased-products'
                        className='d-block px-3 py-2 text-gray-800 hover-bg-neutral-100 text-decoration-none'
                        onClick={() => setAccountMenuOpen(false)}
                        style={{ fontSize: '13px' }}
                      >
                        Orders
                      </Link>
                      <Link
                        to='/wishlist'
                        className='d-block px-3 py-2 text-gray-800 hover-bg-neutral-100 text-decoration-none'
                        onClick={() => setAccountMenuOpen(false)}
                        style={{ fontSize: '13px' }}
                      >
                        Wishlist
                      </Link>
                      {isLoggedIn && (
                        <button
                          type='button'
                          className='w-100 text-start px-3 py-2 text-gray-800 hover-bg-neutral-100 bg-transparent border-0'
                          onClick={handleLogout}
                          style={{ fontSize: '13px' }}
                        >
                          Logout
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Phantom Wallet Button - Mobile - DIRECT CONNECTION */}
                <div style={{ position: 'relative' }}>
                  {isConnected ? (
                    <button
                      type='button'
                      onClick={() => disconnect()}
                      className='bg-success-600 text-white py-2 px-3 rounded-pill d-inline-flex align-items-center gap-2'
                      style={{ fontSize: '12px', minHeight: '40px' }}
                    >
                      <i className='ph ph-wallet' style={{ fontSize: '16px' }} />
                      <span>{formatAddress(walletAddress)}</span>
                    </button>
                  ) : (
                    <button
                      type='button'
                      onClick={connectPhantomWallet}
                      className='bg-warning-600 text-white py-2 px-3 rounded-pill d-inline-flex align-items-center gap-2'
                      style={{ fontSize: '12px', minHeight: '40px' }}
                    >
                      <i className='ph ph-wallet' style={{ fontSize: '16px' }} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Full Width Search Bar with Category Dropdown */}
            <div className='py-2'>
              <form
                onSubmit={handleSearchSubmit}
                className='w-100'
              >
                <div className="d-flex align-items-stretch" style={{ height: '48px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
                  {/* Custom Category Dropdown Button */}
                  <div ref={mobileCategoryRef} className='position-relative'>
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        setMobileCategoryOpen(!mobileCategoryOpen);
                      }}
                      className="border-0 bg-white d-flex align-items-center justify-content-between"
                      style={{ 
                        width: '90px',
                        minWidth: '70px',
                        fontSize: '12px', 
                        padding: '0 8px',
                        cursor: 'pointer',
                        outline: 'none',
                        height: '100%'
                      }}
                    >
                      <span className='text-truncate' style={{ maxWidth: '60px' }}>
                        {selectedCategory || 'All'}
                      </span>
                      <i className={`ph ${mobileCategoryOpen ? 'ph-caret-up' : 'ph-caret-down'}`} style={{ fontSize: '14px', marginLeft: '4px' }} />
                    </button>

                    {/* Category Dropdown Menu */}
                    {mobileCategoryOpen && (
                      <div
                        className='position-absolute bg-white border border-gray-100 rounded-3 shadow-sm'
                        style={{
                          top: 'calc(100% + 8px)',
                          left: 0,
                          minWidth: '200px',
                          maxWidth: 'calc(100vw - 40px)',
                          maxHeight: '300px',
                          overflowY: 'auto',
                          zIndex: 9999,
                          boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* All Categories Option */}
                        <button
                          type='button'
                          onClick={() => {
                            setSelectedCategory('');
                            setMobileCategoryOpen(false);
                          }}
                          className={`w-100 text-start px-3 py-2 border-0 ${!selectedCategory ? 'bg-primary-50 text-primary-600' : 'bg-white text-gray-800'}`}
                          style={{ 
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if (selectedCategory !== '') {
                              e.target.style.backgroundColor = '#f3f4f6';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedCategory !== '') {
                              e.target.style.backgroundColor = '#fff';
                            }
                          }}
                        >
                          All Categories
                        </button>

                        {/* Category Options */}
                        {categories.map((cat) => (
                          <button
                            key={cat.category}
                            type='button'
                            onClick={() => {
                              setSelectedCategory(cat.category);
                              setMobileCategoryOpen(false);
                            }}
                            className={`w-100 text-start px-3 py-2 border-0 ${selectedCategory === cat.category ? 'bg-primary-50 text-primary-600' : 'bg-white text-gray-800'}`}
                            style={{ 
                              fontSize: '13px',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (selectedCategory !== cat.category) {
                                e.target.style.backgroundColor = '#f3f4f6';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (selectedCategory !== cat.category) {
                                e.target.style.backgroundColor = '#fff';
                              }
                            }}
                          >
                            {cat.category}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div style={{ width: '1px', backgroundColor: '#e5e7eb', alignSelf: 'stretch' }} />

                  {/* Search Input */}
                  <input
                    type="text"
                    className="border-0"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ 
                      flex: 1,
                      fontSize: '14px',
                      padding: '0 12px',
                      outline: 'none',
                      minWidth: 0
                    }}
                  />

                  {/* Search Button */}
                  <button
                    type="submit"
                    className="bg-main-two-600 text-white border-0 d-flex align-items-center justify-content-center"
                    style={{
                      width: '48px',
                      flexShrink: 0,
                      cursor: 'pointer',
                      fontSize: '20px'
                    }}
                  >
                    <i className="ph ph-magnifying-glass" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </header>
      {/* ======================= Middle Header End ========================= */}

      {/* ==================== Header Start Here ==================== */}
      <header
        className={`header bg-white border-bottom border-gray-100 ${scroll && "fixed-header"
          }`}
      >
      </header>
    </>
  );
};

export default HeaderOne;