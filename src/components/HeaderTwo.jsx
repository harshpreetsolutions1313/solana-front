import React, { useEffect, useState } from "react";
import query from "jquery";
import axios from "axios";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { API_ENDPOINTS } from "../config/api";

const HeaderTwo = ({ category }) => {
  const navigate = useNavigate();

  /* ================= Scroll ================= */
  const [scroll, setScroll] = useState(false);

  useEffect(() => {
    window.onscroll = () => {
      setScroll(window.pageYOffset > 150);
      return () => (window.onscroll = null);
    };
  }, []);

  /* ================= Select2 ================= */
  useEffect(() => {
    const selectElement = query(".js-example-basic-single");
    selectElement.select2();

    return () => {
      if (selectElement.data("select2")) {
        selectElement.select2("destroy");
      }
    };
  }, []);

  /* ================= Categories ================= */
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.CATEGORY_DETAILS);
        setCategories(res.data || []);
      } catch (error) {
        console.error("Failed to fetch categories", error);
      }
    };
    fetchCategories();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    if (!searchQuery && !selectedCategory) return;

    const params = new URLSearchParams();
    if (selectedCategory) params.set("category", selectedCategory);
    if (searchQuery) params.set("q", searchQuery);

    navigate(`/shop?${params.toString()}`);
  };

  /* ================= Language ================= */
  const [selectedLanguage, setSelectedLanguage] = useState("Eng");
  const handleLanguageChange = (language) => setSelectedLanguage(language);

  /* ================= Currency ================= */
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const handleCurrencyChange = (currency) => setSelectedCurrency(currency);

  /* ================= Mobile Menu ================= */
  const [menuActive, setMenuActive] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);

  const handleMenuClick = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const handleMenuToggle = () => {
    setMenuActive(!menuActive);
    setActiveIndex(null);
  };

  /* ================= Search Overlay ================= */
  const [activeSearch, setActiveSearch] = useState(false);
  const handleSearchToggle = () => setActiveSearch(!activeSearch);

  return (
    <>
      <div className="overlay" />
      <div className={`side-overlay ${menuActive && "show"}`} />

      {/* ================= Search Overlay ================= */}
      <form
        className={`search-box ${activeSearch && "active"}`}
        onSubmit={handleSearchSubmit}
      >
        <button
          type="button"
          onClick={handleSearchToggle}
          className="search-box__close position-absolute inset-block-start-0 inset-inline-end-0 m-16 w-48 h-48 border border-gray-100 rounded-circle flex-center text-white"
        >
          <i className="ph ph-x" />
        </button>

        <div className="container">
          <div className="position-relative">
            <input
              type="text"
              className="form-control py-16 px-24 text-xl rounded-pill pe-64"
              placeholder="Search for a product or brand"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className="w-48 h-48 bg-main-600 rounded-circle flex-center text-xl text-white position-absolute top-50 translate-middle-y inset-inline-end-0 me-8"
            >
              <i className="ph ph-magnifying-glass" />
            </button>
          </div>
        </div>
      </form>

      {/* ================= Header ================= */}
      <header className="header-middle style-two bg-color-one border-bottom border-gray-100">
        <div className="container container-lg">
          <nav className="header-inner flex-between">
            {/* Logo */}
            <div className="logo">
              <Link to="/">
                <img src="assets/images/logo/logo.png" alt="Logo" />
              </Link>
            </div>

            {/* ================= Search Bar ================= */}
            <form
              className="flex-align flex-wrap form-location-wrapper"
              onSubmit={handleSearchSubmit}
            >
              <div className="search-category style-two d-flex h-48 search-form d-sm-flex d-none">
                <select
                  className="js-example-basic-single border-0"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.category}>
                      {cat.category}
                    </option>
                  ))}
                </select>

                <div className="search-form__wrapper position-relative">
                  <input
                    type="text"
                    className="search-form__input common-input py-13 ps-16 pe-18 border-0"
                    placeholder="Search for a product or brand"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="bg-main-two-600 flex-center text-xl text-white w-48"
                >
                  <i className="ph ph-magnifying-glass" />
                </button>
              </div>
            </form>

            {/* ================= Right Icons ================= */}
            <div className="header-right d-lg-block d-none">
              <div className="header-two-activities flex-align gap-32">
                <Link to="/account" className="item-hover-two d-flex flex-column align-items-center">
                  <i className="ph ph-user text-2xl text-gray-700" />
                  <span className="mt-4 text-sm text-gray-700">Profile</span>
                </Link>

                <Link to="/wishlist" className="item-hover-two d-flex flex-column align-items-center">
                  <i className="ph ph-heart text-2xl text-gray-700" />
                  <span className="mt-4 text-sm text-gray-700">Wishlist</span>
                </Link>

                <Link to="/cart" className="item-hover-two d-flex flex-column align-items-center">
                  <i className="ph ph-shopping-cart-simple text-2xl text-gray-700" />
                  <span className="mt-4 text-sm text-gray-700">Cart</span>
                </Link>
              </div>

            </div>
          </nav>
        </div>
      </header>
    </>
  );
};

export default HeaderTwo;
