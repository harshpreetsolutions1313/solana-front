import React from "react";
import Preloader from "../helper/Preloader";
import ColorInit from "../helper/ColorInit";
import HeaderTwo from "../components/HeaderTwo";
import Breadcrumb from "../components/Breadcrumb";
import FooterTwo from "../components/FooterTwo";
import BottomFooter from "../components/BottomFooter";
import ShippingOne from "../components/ShippingOne";
import Checkout from "../components/Checkout";
import ScrollToTop from "react-scroll-to-top";
import FooterFour from "../components/FooterFour";


const CheckoutPage = () => {



  return (
    <>
      {/* ColorInit */}
      <ColorInit color={true} />

      {/* ScrollToTop */}
      <ScrollToTop smooth color="#299E60" />

      {/* Preloader */}
      <Preloader />

      {/* HeaderTwo */}
      <HeaderTwo category={true} />

      {/* Breadcrumb */}
      <Breadcrumb title={"Checkout"} />

      {/* Checkout */}
      <Checkout />

      {/* ShippingOne */}
      <ShippingOne />

      {/* FooterFour */}
      <FooterFour />

      {/* BottomFooter */}
      {/* <BottomFooter /> */}


    </>
  );
};

export default CheckoutPage;
