import { BrowserRouter, Route, Routes } from "react-router-dom";
import RouteScrollToTop from "./helper/RouteScrollToTop";
import HomePageOne from "./pages/HomePageOne";
import HomePageTwo from "./pages/HomePageTwo";
import HomePageThree from "./pages/HomePageThree";
import ShopPage from "./pages/ShopPage";
import ProductDetailsPageOne from "./pages/ProductDetailsPageOne";
import ProductDetailsPageTwo from "./pages/ProductDetailsPageTwo";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import AccountPage from "./pages/AccountPage";
import BlogPage from "./pages/BlogPage";
import BlogDetailsPage from "./pages/BlogDetailsPage";
import ContactPage from "./pages/ContactPage";
import PhosphorIconInit from "./helper/PhosphorIconInit";
import VendorPage from "./pages/VendorPage";
import VendorDetailsPage from "./pages/VendorDetailsPage";
import VendorTwoPage from "./pages/VendorTwoPage";
import VendorTwoDetailsPage from "./pages/VendorTwoDetailsPage";
import BecomeSellerPage from "./pages/BecomeSellerPage";
import WishlistPage from "./pages/WishlistPage";
import PurchasedProductsSection from "./components/PurchasedProductsSection";
import { Toaster } from 'react-hot-toast';
import PurchasedProductsPage from "./pages/PurchasedProductsPage";
import { SolanaWalletProvider } from './components/SolanaWalletProvider';
import WalletRedirect from './components/WalletRedirect';
// import { WalletProvider } from './context/WalletContext';

// import { createAppKit } from '@reown/appkit/react'
// import { WagmiProvider } from 'wagmi'
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// import { projectId, metadata, networks, wagmiAdapter } from './config/appkit-config'

// const queryClient = new QueryClient()
// const generalConfig = {
//   projectId,
//   networks,
//   metadata,
//   themeMode: 'light',
//   themeVariables: {
//     '--w3m-accent': '#FF0000',
//     '--apkt-accent': '#FF0000',
//     '--w3m-color-mix': '#217F4C'
//   }
// }

// Create modal
// createAppKit({
//   adapters: [wagmiAdapter],
//   ...generalConfig,
//   features: {
//     analytics: true // Optional - defaults to your Cloud configuration
//   }
// })



function App() {
  return (

    // <WalletProvider>
    // <WagmiProvider config={wagmiAdapter.wagmiConfig}>
    // <QueryClientProvider client={queryClient}>

    <SolanaWalletProvider>

    <BrowserRouter>
      <RouteScrollToTop />
      <PhosphorIconInit />
      {/* <appkit-button /> */}
      <Toaster position="top-right" />
      <Routes>

        <Route exact path='/' element={<HomePageOne />} />
        <Route exact path='/index-two' element={<HomePageTwo />} />
        <Route exact path='/index-three' element={<HomePageThree />} />
        <Route exact path='/shop' element={<ShopPage />} />
        <Route
          exact
          path='/product-details/:id'
          element={<ProductDetailsPageOne />}
        />
        {/* <Route
          exact 
          path='/product-details-two'
          element={<ProductDetailsPageTwo />}
        /> */}
        <Route exact path='/cart' element={<CartPage />} />
        <Route exact path='/checkout' element={<CheckoutPage />} />
        {/* <Route exact path='/become-seller' element={<BecomeSellerPage />} /> */}
        <Route exact path='/wishlist' element={<WishlistPage />} />
        <Route exact path='/account' element={<AccountPage />} />
        <Route exact path='/purchased-products' element={<PurchasedProductsPage />} />
        <Route path="/wallet-redirect" element={<WalletRedirect />} />
        {/* <Route exact path='/blog' element={<BlogPage />} />
        <Route exact path='/blog-details' element={<BlogDetailsPage />} />
        <Route exact path='/contact' element={<ContactPage />} />
        <Route exact path='/vendor' element={<VendorPage />} />
        <Route exact path='/vendor-details' element={<VendorDetailsPage />} />
        <Route exact path='/vendor-two' element={<VendorTwoPage />} />
        <Route
          exact
          path='/vendor-two-details'
          element={<VendorTwoDetailsPage />}
        /> */}
      </Routes>
    </BrowserRouter>

    </SolanaWalletProvider>

    // </QueryClientProvider>
    // </WagmiProvider>

    // </WalletProvider>
    
  );
}

export default App;
