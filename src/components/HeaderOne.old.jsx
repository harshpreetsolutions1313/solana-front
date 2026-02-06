import React, { useCallback, useEffect, useRef, useState } from "react";
import query from "jquery";
import { Link, NavLink, useNavigate } from "react-router-dom";
import axios from 'axios';
import { ethers } from 'ethers';
import { API_ENDPOINTS } from '../config/api';
import { useWallet } from '../context/WalletContext';
import toast from 'react-hot-toast'

const HeaderOne = () => {

  const { connectWallet, disconnectWallet, address, walletType, isConnected } = useWallet();

  const [scroll, setScroll] = useState(false);

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
        const id = product._id || entry.productId || '';
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

  const handleConnectWallet = async (type = 'metamask') => {
    try {
      await connectWallet(type);
      setShowWalletModal(false);
      toast.success(`Connected via ${type === 'walletconnect' ? 'WalletConnect' : 'MetaMask'}`);
    } catch (err) {
      toast.error(err.message || 'Failed to connect wallet');
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnectWallet();
      toast.success('Wallet disconnected');
    } catch (err) {
      toast.error('Failed to disconnect');
    }
  };

  // Search state
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Categories state (for secondary navbar)
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchCats = async () => {
      setCategoriesLoading(true);
      try {
        const res = await axios.get(API_ENDPOINTS.CATEGORIES_DETAILS);
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

  // Wallet modal click outside handler
  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     if (walletModalRef.current && !walletModalRef.current.contains(event.target)) {
  //       setShowWalletModal(false);
  //     }
  //   };

  //   if (showWalletModal) {
  //     document.addEventListener('mousedown', handleClickOutside);
  //   }

  //   return () => {
  //     document.removeEventListener('mousedown', handleClickOutside);
  //   };
  // }, [showWalletModal]);

  // Wallet modal click outside handler
  useEffect(() => {
    if (!showWalletModal) return;

    const handleClickOutside = (event) => {
      // 1. Click inside modal → keep open
      if (walletModalRef.current?.contains(event.target)) {
        return;
      }

      // 2. Click on the "Connect Wallet" trigger button → keep open (or let toggle handle it)
      if (walletButtonRef.current?.contains(event.target)) {
        return;
      }

      // 3. Everything else → close
      setShowWalletModal(false);
    };

    // Use mousedown + touchstart to cover both desktop & mobile
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showWalletModal]);

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
            <img src='assets/images/logo/logo.png' alt='Logo' />
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
          <nav className='header-inner d-none d-lg-flex align-items-center' style={{ gap: '16px', position: 'relative', zIndex: 10 }}>

            <Link to='/' className='link' style={{ flexShrink: 0, marginRight: '16px' }}>
              <img src='assets/images/logo/logo.png' alt='Logo' style={{ height: '40px' }} />
            </Link>

            <form
              onSubmit={(e) => { e.preventDefault(); navigate(`/shop?search=${encodeURIComponent(searchQuery)}`); setShowSearchDropdown(false); }}
              style={{ flex: 1, minWidth: 0, position: 'relative' }}
            >
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchResults.length) setShowSearchDropdown(true); }}
                  onBlur={() => { setTimeout(() => setShowSearchDropdown(false), 200); }}
                  type='text'
                  className='search-form__input common-input py-13 ps-16 pe-18 rounded-end-pill pe-44'
                  placeholder='Search for a product or brand'
                  aria-label='Search products'
                  style={{ width: '100%', paddingRight: '50px' }}
                />
                <button
                  type='submit'
                  className='w-32 h-32 bg-main-600 rounded-circle flex-center text-xl text-white position-absolute top-50 translate-middle-y inset-inline-end-0 me-8'
                  style={{ border: 'none', cursor: 'pointer' }}
                >
                  <i className='ph ph-magnifying-glass' />
                </button>

                {showSearchDropdown && (
                  <div className='search-dropdown common-dropdown position-absolute bg-white shadow-sm' style={{ top: '56px', left: 0, right: 0, zIndex: 3000, border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <div className='px-12 py-8'>
                      {searchLoading && <div className='text-sm text-gray-500'>Searching...</div>}
                      {searchError && <div className='text-sm text-danger'>{searchError}</div>}
                      {!searchLoading && searchResults.length === 0 && <div className='text-sm text-gray-500'>No results</div>}
                      <ul className='list-unstyled mb-0'>
                        {searchResults.slice(0, 6).map((p) => (
                          <li key={p._id} className='d-flex gap-12 align-items-center py-8 border-bottom'>
                            <Link to={`/product-details/${p._id}`} onClick={() => setShowSearchDropdown(false)} className='d-flex gap-12 align-items-center text-inherit'>
                              <img src={p.images?.[0] || '/images/no-image.svg'} alt={p.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} onError={(e) => e.target.src = '/images/no-image.svg'} />
                              <div>
                                <div className='text-sm fw-medium'>{p.name}</div>
                                <div className='text-xs text-gray-500'>${Number(p.price).toFixed(2)}</div>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <div className='text-end mt-8'>
                        <Link to={`/shop?search=${encodeURIComponent(searchQuery)}`} onClick={() => setShowSearchDropdown(false)} className='text-sm text-main-600'>See all results →</Link>
                      </div>
                    </div>
                  </div>
                )}
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
                      onClick={(e) => { e.stopPropagation(); toggleAccountMenu(); }}
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

                  {/* Wallet Button - DESKTOP */}
                  <div className='position-relative' ref={walletButtonRef} style={{ zIndex: 3500 }}>
                    {isConnected ? (
                      <div className='d-flex align-items-center gap-2'>
                        <button
                          type='button'
                          className='bg-main-600 text-white py-8 px-12 rounded-pill d-inline-flex align-items-center gap-4'
                          style={{ cursor: 'default' }}
                        >
                          <span className='text-md fw-medium'>
                            {`${address.slice(0, 6)}...${address.slice(-4)}`}
                          </span>
                          <span className='badge bg-white text-main-600 px-2 py-1' style={{ fontSize: '10px' }}>
                            {walletType === 'walletconnect' ? 'WC' : 'MM'}
                          </span>
                        </button>
                        <button
                          onClick={handleDisconnectWallet}
                          type='button'
                          className='text-gray-600 hover-text-main-600'
                          style={{ cursor: 'pointer' }}
                          title='Disconnect wallet'
                        >
                          <i className='ph ph-x-circle text-xl' />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setShowWalletModal(!showWalletModal)}
                          type='button'
                          className='bg-main-600 text-white py-8 px-12 rounded-pill d-inline-flex align-items-center gap-4'
                          style={{ cursor: 'pointer' }}
                        >
                          <span className='text-md fw-medium'>Connect Wallet</span>
                          <i className={`ph ${showWalletModal ? 'ph-caret-up' : 'ph-caret-down'}`} />
                        </button>

                        {showWalletModal && (
                          <div
                            ref={walletModalRef}
                            className='common-dropdown position-absolute bg-white border border-gray-100 rounded-12 shadow-sm overflow-hidden'
                            style={{
                              minWidth: 220,
                              right: 0,
                              top: 'calc(100% + 8px)',
                              zIndex: 4000,
                              boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <div className='px-16 py-12 border-bottom border-gray-100'>
                              <span className='fw-semibold text-gray-800'>Choose Wallet</span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConnectWallet('metamask');

                                // setShowWalletModal(false);
                              }}
                              className='w-100 d-flex align-items-center gap-12 px-16 py-12 border-0 bg-transparent hover-bg-neutral-100 text-start'
                              style={{ cursor: 'pointer' }}
                            >
                              <img
                                src='https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg'
                                alt='MetaMask'
                                style={{ width: 32, height: 32 }}
                              />
                              <div>
                                <div className='fw-medium text-gray-800'>MetaMask</div>
                                <div className='text-xs text-gray-500'>Connect using browser wallet</div>
                              </div>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log("wallet connect - button click happens")

                                handleConnectWallet('walletconnect');
                                // setTimeout(() => setShowWalletModal(false), 1000);
                                // setShowWalletModal(false);
                              }}
                              className='w-100 d-flex align-items-center gap-12 px-16 py-12 border-0 bg-transparent hover-bg-neutral-100 text-start'
                              style={{ cursor: 'pointer' }}
                            >
                              <img
                                src='https://image.pngaaa.com/296/6917296-middle.png'
                                alt='WalletConnect'
                                style={{ width: 32, height: 32 }}
                              />
                              <div>
                                <div className='fw-medium text-gray-800'>WalletConnect</div>
                                <div className='text-xs text-gray-500'>Scan with mobile wallet</div>
                              </div>
                            </button>
                          </div>
                        )}
                      </>
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
                <img src='assets/images/logo/logo.png' alt='Logo' style={{ height: '32px', width: 'auto', maxWidth: '100px', objectFit: 'contain' }} />
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
                      // style={{
                      //   minWidth: '280px',
                      //   maxWidth: 'calc(100vw - 40px)',
                      //   right: '-8px',
                      //   top: '100%',
                      //   marginTop: '8px',
                      //   zIndex: 9999,
                      //   boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                      // }}
                      style={{
                        minWidth: '280px',
                        maxWidth: 'calc(100vw - 40px)',
                        right: 'auto', // Remove right alignment
                        left: '50%',   // Center horizontally under the button
                        transform: 'translateX(-50%)', // Adjust for centering
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
                    onClick={toggleAccountMenu}
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
                        zIndex: 2100
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

                {/* Wallet Button - MOBILE */}
                <div className='position-relative'>
                  {isConnected ? (
                    <div className='d-flex align-items-center gap-1'>
                      <button
                        type='button'
                        className='bg-main-600 text-white py-2 px-3 rounded-pill d-inline-flex align-items-center gap-1'
                        style={{ fontSize: '12px', minHeight: '40px', cursor: 'default' }}
                      >
                        <span>{`${address.slice(0, 4)}...${address.slice(-3)}`}</span>
                        <span className='badge bg-white text-main-600' style={{ fontSize: '9px', padding: '2px 4px' }}>
                          {walletType === 'walletconnect' ? 'WC' : 'MM'}
                        </span>
                      </button>
                      <button
                        onClick={handleDisconnectWallet}
                        type='button'
                        className='text-gray-600'
                        style={{ cursor: 'pointer', fontSize: '18px' }}
                      >
                        <i className='ph ph-x-circle' />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowWalletModal(!showWalletModal)}
                        type='button'
                        className='bg-main-600 text-white py-2 px-3 rounded-pill d-inline-flex align-items-center gap-1'
                        style={{ fontSize: '12px', whiteSpace: 'nowrap', minHeight: '40px' }}
                      >
                        <i className='ph ph-wallet' style={{ fontSize: '16px' }} />
                        <span>Connect</span>
                      </button>

                      {showWalletModal && (
                        <div
                          ref={walletModalRef}
                          className='common-dropdown position-absolute bg-white border border-gray-100 rounded-3 shadow-sm overflow-hidden'
                          // style={{
                          //   minWidth: '200px',
                          //   maxWidth: 'calc(100vw - 40px)',
                          //   right: 0,
                          //   top: '100%',
                          //   marginTop: '8px',
                          //   zIndex: 9999,
                          //   boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                          // }}
                          style={{
                            minWidth: '220px',                    // or 240px if you want it a bit wider
                            maxWidth: 'calc(100vw - 32px)',       // safety against ultra-narrow windows
                            top: 'calc(100% + 8px)',
                            marginTop: '8px',
                            zIndex: 9999,
                            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                            // ──────── the important centering part ────────
                            left: '50%',
                            transform: 'translateX(-50%)',
                            right: 'auto',                        // ← remove right:0 influence
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <div className='px-3 py-2 border-bottom border-gray-100'>
                            <span className='fw-semibold text-gray-800' style={{ fontSize: '13px' }}>Choose Wallet</span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConnectWallet('metamask');
                              // setShowWalletModal(false);
                            }}
                            className='w-100 d-flex align-items-center gap-2 px-3 py-2 border-0 bg-transparent hover-bg-neutral-100 text-start'
                            style={{ cursor: 'pointer' }}
                          >
                            <img
                              src='https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg'
                              alt='MetaMask'
                              style={{ width: 28, height: 28 }}
                            />
                            <div>
                              <div className='fw-medium text-gray-800' style={{ fontSize: '13px' }}>MetaMask</div>
                              <div className='text-gray-500' style={{ fontSize: '10px' }}>Browser wallet</div>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              handleConnectWallet('walletconnect');
                              // setShowWalletModal(false);
                            }}
                            className='w-100 d-flex align-items-center gap-2 px-3 py-2 border-0 bg-transparent hover-bg-neutral-100 text-start'
                            style={{ cursor: 'pointer' }}
                          >
                            <img
                              src='https://image.pngaaa.com/296/6917296-middle.png'
                              alt='WalletConnect'
                              style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }}
                            />
                            <div>
                              <div className='fw-medium text-gray-800' style={{ fontSize: '13px' }}>WalletConnect</div>
                              <div className='text-gray-500' style={{ fontSize: '10px' }}>Mobile wallet</div>
                            </div>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Full Width Search Bar */}
            <div className='py-2'>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
                  setShowSearchDropdown(false);
                }}
                className='w-100'
              >
                <div className='position-relative'>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => { if (searchResults.length) setShowSearchDropdown(true); }}
                    onBlur={() => { setTimeout(() => setShowSearchDropdown(false), 200); }}
                    type='text'
                    className='form-control py-2 ps-3 pe-5 rounded-pill'
                    placeholder='Search products...'
                    aria-label='Search products'
                    style={{ fontSize: '14px', height: '44px' }}
                  />
                  <button
                    type='submit'
                    className='position-absolute top-50 translate-middle-y end-0 me-2 bg-main-600 text-white rounded-circle d-flex align-items-center justify-content-center border-0'
                    style={{ width: '36px', height: '36px' }}
                  >
                    <i className='ph ph-magnifying-glass text-lg' />
                  </button>

                  {/* Search Dropdown for Mobile */}
                  {showSearchDropdown && (
                    <div
                      className='position-absolute bg-white shadow-sm border border-gray-100 rounded-3 mt-1 w-100'
                      style={{ zIndex: 2000, maxHeight: '400px', overflowY: 'auto' }}
                    >
                      <div className='p-2'>
                        {searchLoading && <div className='text-gray-500 p-2' style={{ fontSize: '13px' }}>Searching...</div>}
                        {searchError && <div className='text-danger p-2' style={{ fontSize: '13px' }}>{searchError}</div>}
                        {!searchLoading && searchResults.length === 0 && <div className='text-gray-500 p-2' style={{ fontSize: '13px' }}>No results</div>}
                        <ul className='list-unstyled mb-0'>
                          {searchResults.slice(0, 6).map((p) => (
                            <li key={p._id} className='border-bottom'>
                              <Link
                                to={`/product-details/${p._id}`}
                                onClick={() => setShowSearchDropdown(false)}
                                className='d-flex gap-2 align-items-center text-inherit text-decoration-none p-2'
                              >
                                <img
                                  src={p.images?.[0] || '/images/no-image.svg'}
                                  alt={p.name}
                                  style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
                                  onError={(e) => e.target.src = '/images/no-image.svg'}
                                />
                                <div className='flex-grow-1'>
                                  <div className='fw-medium text-truncate' style={{ fontSize: '13px' }}>{p.name}</div>
                                  <div className='text-gray-500' style={{ fontSize: '11px' }}>${Number(p.price).toFixed(2)}</div>
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <div className='text-center mt-2'>
                          <Link
                            to={`/shop?search=${encodeURIComponent(searchQuery)}`}
                            onClick={() => setShowSearchDropdown(false)}
                            className='text-main-600'
                            style={{ fontSize: '12px' }}
                          >
                            See all results →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </header>
      {/* ======================= Middle Header End ========================= */}

      {/* ======================= Categories Bar (secondary nav) ========================= */}
      {/* <div className='categories-bar bg-white border-bottom'>
        <div className='container container-lg'>
          <nav className='categories-inner d-flex align-items-center gap-12 overflow-auto' style={{ padding: '8px 0', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style>{`.categories-inner::-webkit-scrollbar { display: none; }`}</style>

            {categoriesLoading ? (
              <div className='text-sm text-gray-500'>Loading categories...</div>
            ) : (
              (categories || []).slice(0, 8).map((cat, idx) => (
                <Link
                  key={(cat.category || '') + idx}
                  to={`/shop?category=${encodeURIComponent(cat.category)}`}
                  className='d-flex align-items-center text-inherit text-decoration-none me-12'
                  style={{ minWidth: 120 }}
                >
                  <img src={cat.imageUrl || '/images/no-image.svg'} alt={cat.category} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }} onError={(e) => e.target.src = '/images/no-image.svg'} />
                  <span className='ms-8 text-sm text-gray-700'>{cat.category}</span>
                </Link>
              ))
            )}
          </nav>
        </div>
      </div> */}

      {/* ==================== Header Start Here ==================== */}
      <header
        className={`header bg-white border-bottom border-gray-100 ${scroll && "fixed-header"
          }`}
      >
        {/* <div className='container container-lg'>
          <nav className='header-inner d-flex justify-content-between gap-8'>
            <div className='flex-align menu-category-wrapper'>
              <div className='category on-hover-item'>
                <div
                  className={`responsive-dropdown cat on-hover-dropdown common-dropdown nav-submenu p-0 submenus-submenu-wrapper ${activeCategory && "active"
                    }`}
                >
                  <button
                    onClick={() => {
                      handleCategoryToggle();
                      setActiveIndexCat(null);
                    }}
                    type='button'
                    className='close-responsive-dropdown rounded-circle text-xl position-absolute inset-inline-end-0 inset-block-start-0 mt-4 me-8 d-lg-none d-flex'
                  >
                    {" "}
                    <i className='ph ph-x' />{" "}
                  </button>
                  <div className='logo px-16 d-lg-none d-block'>
                    <Link to='/' className='link'>
                      <img src='assets/images/logo/logo.png' alt='Logo' />
                    </Link>
                  </div>
                  <ul className='scroll-sm p-0 py-8 w-300 max-h-400 overflow-y-auto'>
                    <li
                      onClick={() => handleCatClick(0)}
                      className={`has-submenus-submenu ${activeIndexCat === 0 ? "active" : ""
                        }`}
                    >
                      <Link
                        onClick={() => setActiveIndexCat(null)}
                        to='#'
                        className='text-gray-500 text-15 py-12 px-16 flex-align gap-8 rounded-0'
                      >
                        <span className='text-xl d-flex'>
                          <i className='ph ph-carrot' />
                        </span>
                        <span>Vegetables &amp; Fruit</span>
                        <span className='icon text-md d-flex ms-auto'>
                          <i className='ph ph-caret-right' />
                        </span>
                      </Link>
                      <div
                        className={`submenus-submenu py-16 ${activeIndexCat === 0 ? "open" : ""
                          }`}
                      >
                        <h6 className='text-lg px-16 submenus-submenu__title'>
                          Vegetables &amp; Fruit
                        </h6>
                        <ul className='submenus-submenu__list max-h-300 overflow-y-auto scroll-sm'>
                          <li>
                            <Link to='/shop'>Potato &amp; Tomato</Link>
                          </li>
                          <li>
                            <Link to='/shop'>Cucumber &amp; Capsicum</Link>
                          </li>
                          <li>
                            <Link to='/shop'>Leafy Vegetables</Link>
                          </li>
                          <li>
                            <Link to='/shop'>Root Vegetables</Link>
                          </li>
                          <li>
                            <Link to='/shop'>Beans &amp; Okra</Link>
                          </li>
                          <li>
                            <Link to='/shop'>Cabbage &amp; Cauliflower</Link>
                          </li>
                          <li>
                            <Link to='/shop'>Gourd &amp; Drumstick</Link>
                          </li>
                          <li>
                            <Link to='/shop'>Specialty</Link>
                          </li>
                        </ul>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
              <div className='header-menu d-lg-block d-none'>
                <ul className='nav-menu flex-align '>
                  <li className='on-hover-item nav-menu__item has-submenu'>
                  </li>
                </ul>
              </div>
            </div>
            <div className='header-right flex-align'>
              <div className='me-16 d-lg-none d-block'>
                <div className='flex-align flex-wrap gap-12'>
                  <button
                    onClick={handleSearchToggle}
                    type='button'
                    className='search-icon flex-align d-lg-none d-flex gap-4 item-hover'
                  >
                    <span className='text-2xl text-gray-700 d-flex position-relative item-hover__text'>
                      <i className='ph ph-magnifying-glass' />
                    </span>
                  </button>
                  <Link to='/wishlist' className='flex-align gap-4 item-hover'>
                    <span className='text-2xl text-gray-700 d-flex position-relative me-6 mt-6 item-hover__text'>
                      <i className='ph ph-heart' />
                      <span className='w-16 h-16 flex-center rounded-circle bg-main-600 text-white text-xs position-absolute top-n6 end-n4'>
                        2
                      </span>
                    </span>
                    <span className='text-md text-gray-500 item-hover__text d-none d-lg-flex'>
                      Wishlist
                    </span>
                  </Link>
                  <Link to='/cart' className='flex-align gap-4 item-hover'>
                    <span className='text-2xl text-gray-700 d-flex position-relative me-6 mt-6 item-hover__text'>
                      <i className='ph ph-shopping-cart-simple' />
                      <span className='w-16 h-16 flex-center rounded-circle bg-main-600 text-white text-xs position-absolute top-n6 end-n4'>
                        2
                      </span>
                    </span>
                    <span className='text-md text-gray-500 item-hover__text d-none d-lg-flex'>
                      Cart
                    </span>
                  </Link>
                </div>
              </div>
              <button
                onClick={handleMenuToggle}
                type='button'
                className='toggle-mobileMenu d-lg-none ms-3n text-gray-800 text-4xl d-flex'
              >
                {" "}
                <i className='ph ph-list' />{" "}
              </button>
            </div>
          </nav>
        </div> */}
      </header>
    </>
  );
};

export default HeaderOne;