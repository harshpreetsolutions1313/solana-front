import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'



const FooterFour = () => {

    const [categories, setCategories] = useState([])

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get(
                    'https://solana-backend-hazel.vercel.app/api/categories/details'
                )
                setCategories(res.data.slice(0, 6)) // only first 6
            } catch (error) {
                console.error('Failed to fetch categories', error)
            }
        }

        fetchCategories()
    }, [])

    return (
        <footer className="footer py-120">
            <img
                src="/assets/images/bg/body-bottom-bg.png"
                alt="BG"
                className="body-bottom-bg"
            />
            <div className="container container-lg">
                {/* <div className="footer-item-wrapper d-flex align-items-start flex-wrap"> */}

                <div
                    className="footer-item-wrapper align-items-start"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '32px'
                    }}
                >

                    <div className="footer-item">
                        <div className="footer-item__logo">
                            <Link to="/">
                                {" "}
                                <img src="/assets/images/logo/logo.png" alt="" />
                            </Link>
                        </div>
                        <p className="mb-24">
                            Imagine a decentralized grocery platform where farmers receive direct, fair payments, customers access verified organic and traceable products, and every step of the transaction is securely recorded on the blockchain.
                        </p>
                        <div className="flex-align gap-16 mb-16">
                            <span className="w-32 h-32 flex-center rounded-circle bg-main-two-600 text-white text-md flex-shrink-0">
                                <i className="ph-fill ph-map-pin" />
                            </span>
                            <span className="text-md text-gray-900 ">
                                Store1313, SAS Nagar, Punjab
                            </span>
                        </div>
                        <div className="flex-align gap-16 mb-16">
                            <span className="w-32 h-32 flex-center rounded-circle bg-main-two-600 text-white text-md flex-shrink-0">
                                <i className="ph-fill ph-phone-call" />
                            </span>
                            <div className="flex-align gap-16 flex-wrap">
                                <Link
                                    to="/tel:+00123456789"
                                    className="text-md text-gray-900 hover-text-main-two-600"
                                >
                                    +00 123 456 789
                                </Link>
                                <span className="text-md text-main-two-600 ">or</span>
                                <Link
                                    to="/tel:+00987654012"
                                    className="text-md text-gray-900 hover-text-main-two-600"
                                >
                                    +00 987 654 012
                                </Link>
                            </div>
                        </div>
                        <div className="flex-align gap-16 mb-16">
                            <span className="w-32 h-32 flex-center rounded-circle bg-main-two-600 text-white text-md flex-shrink-0">
                                <i className="ph-fill ph-envelope" />
                            </span>
                            <Link
                                to="/mailto:support24@marketpro.com"
                                className="text-md text-gray-900 hover-text-main-two-600"
                            >
                                support24@store1313.com
                            </Link>
                        </div>
                    </div>
                    {/* <div className="footer-item">
                        <h6 className="footer-item__title">Information</h6>
                        <ul className="footer-menu">
                            <li className="mb-16">
                                <Link to="/shop" className="text-gray-600 hover-text-main-two-600">
                                    Become a Vendor
                                </Link>
                            </li>
                            <li className="mb-16">
                                <Link to="/shop" className="text-gray-600 hover-text-main-two-600">
                                    Affiliate Program
                                </Link>
                            </li>
                            <li className="mb-16">
                                <Link to="/shop" className="text-gray-600 hover-text-main-two-600">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li className="mb-16">
                                <Link to="/shop" className="text-gray-600 hover-text-main-two-600">
                                    Our Suppliers
                                </Link>
                            </li>
                            <li className="mb-16">
                                <Link to="/shop" className="text-gray-600 hover-text-main-two-600">
                                    Extended Plan
                                </Link>
                            </li>
                            <li className="">
                                <Link to="/shop" className="text-gray-600 hover-text-main-two-600">
                                    Community
                                </Link>
                            </li>
                        </ul>
                    </div> */}
                    {/* <div className="footer-item">
                        <h6 className="footer-item__title">Customer Support</h6>
                        <ul className="footer-menu">
                            <li className="mb-16">
                                <Link to="/shop" className="text-gray-600 hover-text-main-two-600">
                                    Help Center
                                </Link>
                            </li>
                            <li className="mb-16">
                                <Link
                                    to="/contact"
                                    className="text-gray-600 hover-text-main-two-600"
                                >
                                    Contact Us
                                </Link>
                            </li>
                            <li className="mb-16">
                                <Link to="/shop" className="text-gray-600 hover-text-main-two-600">
                                    Report Abuse
                                </Link>
                            </li>
                            <li className="mb-16">
                                <Link to="/shop" className="text-gray-600 hover-text-main-two-600">
                                    Submit and Dispute
                                </Link>
                            </li>
                            <li className="mb-16">
                                <Link to="/shop" className="text-gray-600 hover-text-main-two-600">
                                    Policies &amp; Rules
                                </Link>
                            </li>
                            <li className="">
                                <Link to="/shop" className="text-gray-600 hover-text-main-two-600">
                                    Online Shopping
                                </Link>
                            </li>
                        </ul>
                    </div> */}
                    {/* <div className="footer-item">
                        <h6 className="footer-item__title">My Account</h6>
                        <ul className="footer-menu">
                            <li className="mb-16">
                                <Link to="/shop" className="text-gray-600 hover-text-main-two-600">
                                    My Account
                                </Link>
                            </li>
                            <li className="mb-16">
                                <Link to="/shop" className="text-gray-600 hover-text-main-two-600">
                                    Order History
                                </Link>
                            </li>
                            <li className="mb-16">
                                <Link to="/shop" className="text-gray-600 hover-text-main-two-600">
                                    Shoping Cart
                                </Link>
                            </li>
                            <li className="mb-16">
                                <Link to="/shop" className="text-gray-600 hover-text-main-two-600">
                                    Compare
                                </Link>
                            </li>
                            <li className="mb-16">
                                <Link to="/shop" className="text-gray-600 hover-text-main-two-600">
                                    Help Ticket
                                </Link>
                            </li>
                            <li className="">
                                <Link to="/wishlist" className="text-gray-600 hover-text-main-two-600">
                                    Wishlist
                                </Link>
                            </li>
                        </ul>
                    </div> */}

                    <div className="footer-item">
                        <h6 className="footer-item__title">My Account</h6>
                        <ul className="footer-menu">
                            <li className="mb-16">
                                <Link to="/account" className="text-gray-600 hover-text-main-two-600">
                                    My Account
                                </Link>
                            </li>
                            <li className="mb-16">
                                <Link
                                    to="/purchased-products"
                                    className="text-gray-600 hover-text-main-two-600"
                                >
                                    Order History
                                </Link>
                            </li>
                            <li className="mb-16">
                                <Link to="/wishlist" className="text-gray-600 hover-text-main-two-600">
                                    Wishlist
                                </Link>
                            </li>
                            <li>
                                <Link to="/cart" className="text-gray-600 hover-text-main-two-600">
                                    Shopping Cart
                                </Link>
                            </li>
                        </ul>
                    </div>


                    <div className="footer-item">
                        <h6 className="footer-item__title">Product Categories</h6>
                        <ul className="footer-menu">
                            {categories.map(cat => (
                                <li key={cat._id} className="mb-16">
                                    <Link
                                        to={`/shop?category=${encodeURIComponent(cat.category)}`}
                                        className="text-gray-600 hover-text-main-two-600 text-capitalize"
                                    >
                                        {cat.category}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="footer-item">
                        <h6 className="">Web3 Grocery Solutions</h6>
                        <p className="mb-16">Web3 Grocery Solutions is revolutionizing the way we shop for groceries by leveraging blockchain technology to deliver unmatched transparency, secure crypto payments, and true ownership of your shopping data.</p>
                        <div className="flex-align gap-8 my-32">
                            <Link to="/https://www.apple.com/store" className="">
                                <img src="assets/images/thumbs/store-img1.png" alt="" />
                            </Link>
                            <Link to="/https://play.google.com/store/apps?hl=en" className="">
                                <img src="assets/images/thumbs/store-img2.png" alt="" />
                            </Link>
                        </div>
                        <ul className="flex-align gap-16">
                            <li>
                                <Link
                                    to="/https://www.facebook.com"
                                    className="w-44 h-44 flex-center bg-main-two-100 text-main-two-600 text-xl rounded-circle hover-bg-main-two-600 hover-text-white"
                                >
                                    <i className="ph-fill ph-facebook-logo" />
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/https://www.twitter.com"
                                    className="w-44 h-44 flex-center bg-main-two-100 text-main-two-600 text-xl rounded-circle hover-bg-main-two-600 hover-text-white"
                                >
                                    <i className="ph-fill ph-twitter-logo" />
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/https://www.linkedin.com"
                                    className="w-44 h-44 flex-center bg-main-two-100 text-main-two-600 text-xl rounded-circle hover-bg-main-two-600 hover-text-white"
                                >
                                    <i className="ph-fill ph-instagram-logo" />
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/https://www.pinterest.com"
                                    className="w-44 h-44 flex-center bg-main-two-100 text-main-two-600 text-xl rounded-circle hover-bg-main-600 hover-text-white"
                                >
                                    <i className="ph-fill ph-linkedin-logo" />
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>

    )
}

export default FooterFour