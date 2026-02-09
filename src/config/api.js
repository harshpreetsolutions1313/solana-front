// API Configuration
// Centralized API base URL configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ||
  'https://solana-backend-hazel.vercel.app';

export const API_ENDPOINTS = {
  BASE_URL: API_BASE_URL,
  PRODUCTS: `${API_BASE_URL}/api/products`,
  PRODUCT_BY_ID: (id) => `${API_BASE_URL}/api/products/${encodeURIComponent(id)}`,
  PRODUCTS_BY_CATEGORY: (category) => `${API_BASE_URL}/api/products/category/${encodeURIComponent(category)}`,
  PRODUCT_SEARCH: (query) => `${API_BASE_URL}/api/products/search?q=${encodeURIComponent(query)}`,
  PRODUCTS_PRICE_RANGE: (minPrice, maxPrice) => {
    const params = [];
    if (minPrice) params.push(`minPrice=${encodeURIComponent(minPrice)}`);
    if (maxPrice) params.push(`maxPrice=${encodeURIComponent(maxPrice)}`);
    return `${API_BASE_URL}/api/products/filter/price-range?${params.join('&')}`;
  },
  // CATEGORIES_DETAILS: `${API_BASE_URL}/api/products/categories/details`,
  CATEGORIES_DETAILS: `${API_BASE_URL}/api/products/category-stats`,
  CATEGORY_DETAILS: `${API_BASE_URL}/api/categories/details`,
  ORDERS_CREATE: `${API_BASE_URL}/api/orders/create`,
  ORDERS_CREATE_BATCH: `${API_BASE_URL}/api/orders/create-batch`,
  CART: `${API_BASE_URL}/api/users/cart`,
  PRODUCT_SEARCH_BY_CATEGORY: (query, category) =>
    `${API_BASE_URL}/api/products/search-by-category?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`,

  // WALLET APIs
  WALLET_FUNDINGS_CREATE: `${API_BASE_URL}/api/wallet/fundings`,

  WALLET_BALANCE: (address, token) =>
    `${API_BASE_URL}/api/wallet/balance/${encodeURIComponent(address)}/${encodeURIComponent(token)}`,

  WALLET_FUNDINGS_BY_USER: (address) =>
    `${API_BASE_URL}/api/wallet/fundings/${encodeURIComponent(address)}`,


  // Wallet Funding Endpoints
  // WALLET_FUNDINGS: `${API_BASE_URL}/api/wallet-fundings`,
  // WALLET_FUNDINGS_CREATE: `${API_BASE_URL}/api/wallet/fundings`,
  // WALLET_FUNDINGS_STATS: `${API_BASE_URL}/api/wallet-fundings/stats`,
  // WALLET_FUNDINGS_BY_USER: (address) => `${API_BASE_URL}/api/wallet-fundings/user/${encodeURIComponent(address)}`,
  // WALLET_FUNDINGS_BY_TX: (txHash) => `${API_BASE_URL}/api/wallet-fundings/tx/${encodeURIComponent(txHash)}`,

  // // Wallet Balance & Payment Endpoints
  // WALLET_BALANCE: (address, token) => `${API_BASE_URL}/api/wallet/balance/${encodeURIComponent(address)}${token ? `?token=${token}` : ''}`,
  WALLET_PAY: `${API_BASE_URL}/api/wallet/pay`,

  // // Transaction Endpoints
  // ALL_TRANSACTIONS: `${API_BASE_URL}/api/users/all-transactions`

};

export default API_ENDPOINTS;
