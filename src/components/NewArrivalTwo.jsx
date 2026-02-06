import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import Slider from 'react-slick'
import { API_ENDPOINTS } from '../config/api'

const NewArrivalTwo = () => {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    // Fetch products on mount
    useEffect(() => {
        const fetchRelatedProducts = async () => {
            try {
                const res = await axios.get(API_ENDPOINTS.PRODUCTS)
                const data = res.data

                let productList = []
                if (data && data.products) {
                    productList = data.products
                } else if (Array.isArray(data)) {
                    productList = data
                }

                setProducts(productList.slice(0, 12)) // Limit for slider performance
            } catch (error) {
                console.error('Failed to load related products:', error)
                toast.error('Failed to load products.')
                setProducts([])
            } finally {
                setLoading(false)
            }
        }

        fetchRelatedProducts()
    }, [])

    // Functional Add to Cart
    const handleAddToCart = async (product) => {
        const token = localStorage.getItem('userToken')

        if (!token) {
            toast.error('Please log in to add items to cart.')
            navigate('/account')
            return
        }

        try {
            const payload = {
                productId: product.id || product.id,
                quantity: 1
            }

            await axios.post(API_ENDPOINTS.CART || API_ENDPOINTS.CART, payload, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            toast.success(`${product.name} added to cart!`, {
                duration: 3000,
                position: 'top-right',
            })

            setTimeout(() => {
                navigate('/cart')
            }, 800)

        } catch (error) {
            console.error('Failed to add to cart:', error)

            const errorMessage =
                error.response?.data?.message ||
                'Failed to add to cart. Please try again.'

            toast.error(errorMessage)

            if (error.response?.status === 401) {
                localStorage.removeItem('userToken')
                toast.error('Session expired. Please log in again.')
                navigate('/account')
            }
        }
    }

    // Custom Arrows
    function SampleNextArrow(props) {
        const { className, onClick } = props
        return (
            <button
                type="button"
                onClick={onClick}
                className={`${className} slick-next slick-arrow flex-center rounded-circle border border-gray-100 hover-border-main-600 text-xl hover-bg-main-600 hover-text-white transition-1`}
            >
                <i className="ph ph-caret-right" />
            </button>
        )
    }

    function SamplePrevArrow(props) {
        const { className, onClick } = props
        return (
            <button
                type="button"
                onClick={onClick}
                className={`${className} slick-prev slick-arrow flex-center rounded-circle border border-gray-100 hover-border-main-600 text-xl hover-bg-main-600 hover-text-white transition-1`}
            >
                <i className="ph ph-caret-left" />
            </button>
        )
    }

    const settings = {
        dots: false,
        arrows: true,
        infinite: products.length > 6,
        speed: 1000,
        slidesToShow: 6,
        slidesToScroll: 1,
        initialSlide: 0,
        nextArrow: <SampleNextArrow />,
        prevArrow: <SamplePrevArrow />,
        responsive: [
            { breakpoint: 1599, settings: { slidesToShow: 6 } },
            { breakpoint: 1399, settings: { slidesToShow: 4 } },
            { breakpoint: 992,  settings: { slidesToShow: 3 } },
            { breakpoint: 575,  settings: { slidesToShow: 2 } },
            { breakpoint: 424,  settings: { slidesToShow: 1 } },
        ],
    }

    return (
        <section className="new-arrival pb-80">
            <div className="container container-lg">
                <div className="section-heading">
                    <div className="flex-between flex-wrap gap-8">
                        <h5 className="mb-0">You Might Also Like</h5>
                        {/* <div className="flex-align gap-16">
                            <Link
                                to="/shop"
                                className="text-sm fw-medium text-gray-700 hover-text-main-600 hover-text-decoration-underline"
                            >
                                All Products
                            </Link>
                        </div> */}
                    </div>
                </div>

                <div className="new-arrival__slider arrow-style-two">
                    {loading ? (
                        <div className="text-center py-40">
                            <div className="spinner-border text-main-600" style={{ width: '3rem', height: '3rem' }} role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : products.length > 0 ? (
                        <Slider {...settings}>
                            {products.map((product) => (
                                <div key={product.id || product.id} className="px-8">
                                    <div className="product-card h-100 p-8 border border-gray-100 hover-border-main-600 rounded-16 position-relative transition-2 bg-white">
                                        <Link
                                            to={`/product-details/${product.id || product.id}`}
                                            className="product-card__thumb flex-center rounded-8 bg-white overflow-hidden"
                                            style={{ height: '200px' }}
                                        >
                                            <img
                                                src={product.images?.[0] || '/images/no-image.svg'}
                                                alt={product.name}
                                                className="max-w-full max-h-full object-contain"
                                            />
                                        </Link>

                                        <div className="product-card__content p-sm-2 mt-12">
                                            <h6 className="title text-lg fw-semibold mb-8">
                                                <Link
                                                    to={`/product-details/${product.id || product.id}`}
                                                    className="link text-line-2 text-gray-900 hover-text-main-600"
                                                >
                                                    {product.name}
                                                </Link>
                                            </h6>

                                            <div className="flex-align gap-4 mb-8">
                                                <span className="text-main-600 text-md d-flex">
                                                    <i className="ph-fill ph-storefront" />
                                                </span>
                                                <span className="text-gray-500 text-xs">By Store</span>
                                            </div>

                                            <div className="product-card__price mb-12">
                                                <span className="text-heading text-md fw-semibold">
                                                    ${Number(product.price || 0).toFixed(2)}{' '}
                                                    <span className="text-gray-500 fw-normal">/Qty</span>
                                                </span>
                                            </div>

                                            <div className="flex-align gap-6 mb-16">
                                                <span className="text-xs fw-bold text-gray-600">4.8</span>
                                                <span className="text-15 fw-bold text-warning-600 d-flex">
                                                    <i className="ph-fill ph-star" />
                                                </span>
                                                <span className="text-xs fw-bold text-gray-600">(17k)</span>
                                            </div>

                                            {/* Functional Add to Cart Button */}
                                            <button
                                                onClick={() => handleAddToCart(product)}
                                                className="product-card__cart btn bg-main-50 text-main-600 hover-bg-main-600 hover-text-white py-11 px-24 rounded-pill flex-center gap-8 w-100 justify-content-center transition-2"
                                            >
                                                Add to Cart <i className="ph ph-shopping-cart" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </Slider>
                    ) : (
                        <div className="text-center py-40 text-gray-500">
                            No products available at the moment.
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

export default NewArrivalTwo