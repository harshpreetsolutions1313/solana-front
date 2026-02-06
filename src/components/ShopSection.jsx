import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import ReactSlider from 'react-slider'
import { API_ENDPOINTS } from '../config/api'

const ShopSection = () => {
    let [grid, setGrid] = useState(false)

    const [products, setProducts] = useState([])
    const [loadingProducts, setLoadingProducts] = useState(false)

    const [pagination, setPagination] = useState({
        totalProducts: 0,
        totalPages: 1,
        currentPage: 1,
        productsPerPage: 10
    })

    const [categories, setCategories] = useState([])
    const [loadingCategories, setLoadingCategories] = useState(false)

    const location = useLocation()
    const navigate = useNavigate()

    // Fetch products
    useEffect(() => {
        const qp = new URLSearchParams(location.search)
        const category = qp.get('category')
        // const search = qp.get('search')
        const search = qp.get('q')
        const minPrice = qp.get('minPrice')
        const maxPrice = qp.get('maxPrice')
        const page = qp.get('page') || '1'
        const limit = qp.get('limit') || '10'

        let url = API_ENDPOINTS.PRODUCTS;

        console.log("Shop filters:", {
            search,
            category,
            finalUrl: url
        });

        // 🔥 HIGHEST PRIORITY: search + category
        if (search && category) {
            url = API_ENDPOINTS.PRODUCT_SEARCH_BY_CATEGORY(search, category);

            // category only
        } else if (category && !search) {
            url = API_ENDPOINTS.PRODUCTS_BY_CATEGORY(category);

            // price range
        } else if (minPrice || maxPrice) {
            url = API_ENDPOINTS.PRODUCTS_PRICE_RANGE(minPrice, maxPrice);

            // search only
        } else if (search && !category) {
            url = API_ENDPOINTS.PRODUCT_SEARCH(search);
        }


        let mounted = true

        const fetchProducts = async () => {
            setLoadingProducts(true)
            try {
                const res = await axios.get(url)
                if (!mounted) return

                const data = res.data

                if (data && data.products) {
                    setProducts(data.products || [])
                    setPagination(data.pagination || {
                        totalProducts: data.products.length,
                        totalPages: 1,
                        currentPage: parseInt(page),
                        productsPerPage: parseInt(limit)
                    })
                } else if (Array.isArray(data)) {
                    setProducts(data)
                    setPagination({
                        totalProducts: data.length,
                        totalPages: 1,
                        currentPage: 1,
                        productsPerPage: data.length
                    })
                } else {
                    setProducts([])
                }
            } catch (e) {
                console.error('Failed to load products', e)
                setProducts([])
            } finally {
                if (mounted) setLoadingProducts(false)
            }
        }

        fetchProducts()
        return () => { mounted = false }
    }, [location.search])

    // Fetch categories
    // Fetch categories
    useEffect(() => {
        let mounted = true

        const fetchCategories = async () => {
            setLoadingCategories(true)
            try {
                const res = await axios.get(API_ENDPOINTS.CATEGORY_DETAILS)
                if (!mounted) return

                const data = Array.isArray(res.data)
                    ? res.data
                    : res.data?.categories || res.data?.data || []

                // ✅ FILTER: only published categories
                const publishedCategories = data.filter(
                    (cat) => cat.publish === true
                )

                setCategories(publishedCategories)
            } catch (e) {
                console.error('Failed to load categories', e)
                setCategories([])
            } finally {
                if (mounted) setLoadingCategories(false)
            }
        }

        fetchCategories()
        return () => { mounted = false }
    }, [])

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.currentPage) return
        const qp = new URLSearchParams(location.search)
        qp.set('page', newPage.toString())
        navigate(`${location.pathname}?${qp.toString()}`)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleAddToCart = async (product) => {
        const token = localStorage.getItem('userToken')
        if (!token) {
            toast.error('Please log in to add items to cart.')
            navigate('/account')
            return
        }

        try {
            const payload = {
                productId: product.id || product._id,
                quantity: 2
            }

            await axios.post(API_ENDPOINTS.CART || API_ENDPOINTS.CART, payload, {
                headers: { Authorization: `Bearer ${token}` }
            })

            toast.success(`${product.name} added to cart!`, {
                duration: 3000,
                position: 'top-right',
            })

            setTimeout(() => navigate('/cart'), 800)
        } catch (error) {
            console.error('Failed to add to cart:', error)
            const msg = error.response?.data?.message || 'Failed to add to cart.'
            toast.error(msg)

            if (error.response?.status === 401) {
                localStorage.removeItem('userToken')
                toast.error('Session expired. Please log in again.')
                navigate('/account')
            }
        }
    }

    const startItem = (pagination.currentPage - 1) * pagination.productsPerPage + 1
    const endItem = Math.min(pagination.currentPage * pagination.productsPerPage, pagination.totalProducts)

    let [active, setActive] = useState(false)
    const sidebarController = () => setActive(!active)

    return (
        <section className="shop py-80">
            <div className={`side-overlay ${active && "show"}`}></div>
            <div className="container container-lg">
                <div className="row">
                    {/* Sidebar */}
                    <div className="col-lg-3">
                        <div className={`shop-sidebar ${active && "active"}`}>
                            <button onClick={sidebarController} type="button"
                                className="shop-sidebar__close d-lg-none d-flex w-32 h-32 flex-center border border-gray-100 rounded-circle hover-bg-main-two-600 position-absolute inset-inline-end-0 me-10 mt-8 hover-text-white hover-border-main-two-600">
                                <i className="ph ph-x" />
                            </button>

                            <div className="shop-sidebar__box border border-gray-100 rounded-8 p-32 mb-32">
                                <h6 className="text-xl border-bottom border-gray-100 pb-24 mb-24">Product Category</h6>
                                <ul className="max-h-540 overflow-y-auto scroll-sm">
                                    {loadingCategories ? (
                                        <li className="mb-24 text-gray-500">Loading categories...</li>
                                    ) : categories.length > 0 ? (
                                        categories.map((cat) => (
                                            <li key={cat._id || cat.id || cat.name} className="mb-24">
                                                <Link
                                                    to={`/shop?category=${encodeURIComponent(
                                                        cat.category || cat.name || cat.title
                                                    )}`}
                                                    className="text-gray-900 hover-text-main-two-600"
                                                >
                                                    {cat.category || cat.name || cat.title} ({cat.count || 0})
                                                </Link>
                                            </li>
                                        ))

                                    ) : (
                                        <li className="mb-24 text-gray-500">No categories available</li>
                                    )}
                                </ul>
                            </div>

                            {/* <div className="shop-sidebar__box border border-gray-100 rounded-8 p-32 mb-32">
                                <h6 className="text-xl border-bottom border-gray-100 pb-24 mb-24">Filter by Price</h6>
                                <div className="custom--range">
                                    <ReactSlider
                                        className="horizontal-slider"
                                        thumbClassName="example-thumb"
                                        trackClassName="example-track"
                                        defaultValue={[0, 100]}
                                        pearling
                                        minDistance={10}
                                        renderThumb={(props, state) => <div {...props}>{state.valueNow}</div>}
                                    />
                                    <br /><br />
                                    <div className="flex-between flex-wrap-reverse gap-8 mt-24">
                                        <button type="button" className="btn btn-main h-40 flex-align">Filter</button>
                                    </div>
                                </div>
                            </div> */}

                            {/* <div className="shop-sidebar__box rounded-8">
                                <img src="assets/images/thumbs/advertise-img1.png" alt="" />
                            </div> */}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="col-lg-9">
                        <div className="flex-between gap-16 flex-wrap mb-40">
                            <span className="text-gray-900">
                                {loadingProducts ? 'Loading products...' : `Showing ${startItem}-${endItem} of ${pagination.totalProducts} results`}
                            </span>
                            {/* <div className="position-relative flex-align gap-16 flex-wrap">
                                <div className="list-grid-btns flex-align gap-16">
                                    <button onClick={() => setGrid(true)} className={`w-44 h-44 flex-center border rounded-6 text-2xl list-btn border-gray-100 ${grid && "border-main-two-600 text-white bg-main-two-600"}`}>
                                        <i className="ph-bold ph-list-dashes" />
                                    </button>
                                    <button onClick={() => setGrid(false)} className={`w-44 h-44 flex-center border rounded-6 text-2xl grid-btn border-gray-100 ${!grid && "border-main-two-600 text-white bg-main-two-600"}`}>
                                        <i className="ph ph-squares-four" />
                                    </button>
                                </div>
                                <div className="position-relative text-gray-500 flex-align gap-4 text-14">
                                    <label htmlFor="sorting">Sort by:</label>
                                    <select className="form-control common-input px-14 py-14 rounded-6 w-auto" id="sorting">
                                        <option>Popular</option>
                                        <option>Latest</option>
                                        <option>Trending</option>
                                        <option>Matches</option>
                                    </select>
                                </div>
                                <button onClick={sidebarController} className="w-44 h-44 d-lg-none d-flex flex-center border border-gray-100 rounded-6 text-2xl sidebar-btn">
                                    <i className="ph-bold ph-funnel" />
                                </button>
                            </div> */}
                        </div>

                        {/* Product Grid */}
                        <div className={`list-grid-wrapper grid-cols-4 ${grid && "list-view"}`}>
                            {loadingProducts && (
                                <div className="w-100 text-center py-40 col-span-full">
                                    <div className="spinner-border text-main-two-600" style={{ width: '3rem', height: '3rem' }} role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            )}

                            {products.length > 0 ? (
                                products.map((p) => (
                                    <div
                                        key={p.id || p.id || p.name}
                                        className="product-card p-16 border border-gray-100 hover-border-main-two-600 rounded-16 position-relative transition-2 flex flex-col bg-white"
                                        style={{ height: '520px' }} // Slightly increased total height to accommodate larger image
                                    >
                                        {/* Larger Image Container - White Background */}
                                        <Link
                                            to={`/product-details/${p.id || p.id}`}
                                            className="product-card__thumb flex-center rounded-8 bg-white position-relative flex-shrink-0"
                                            style={{ height: '260px', overflow: 'hidden' }}
                                        >
                                            <img
                                                src={(p.images && p.images[0]) || '/images/no-image.svg'}
                                                alt={p.name}
                                                className="max-w-100 max-h-100"
                                                style={{ objectFit: 'contain' }}
                                            />
                                            {p.badge && (
                                                <span className="product-card__badge bg-primary-600 px-8 py-4 text-sm text-white position-absolute inset-inline-start-0 inset-block-start-0">
                                                    {p.badge}
                                                </span>
                                            )}
                                        </Link>

                                        {/* Content */}
                                        <div className="product-card__content mt-20 flex flex-col flex-grow justify-between">
                                            <div>
                                                <h6 className="title text-lg fw-semibold mb-8 line-clamp-2">
                                                    <Link to={`/product-details/${p.id || p.id}`} className="link text-gray-900 hover-text-main-two-600">
                                                        {p.name}
                                                    </Link>
                                                </h6>

                                                <div className="flex-align gap-6 mb-12">
                                                    <span className="text-xs fw-medium text-gray-500">{p.rating || '—'}</span>
                                                    <span className="text-15 fw-medium text-warning-600 d-flex"><i className="ph-fill ph-star" /></span>
                                                    <span className="text-xs fw-medium text-gray-500">({p.reviews || 0})</span>
                                                </div>

                                                <div className="mb-12">
                                                    <div className="progress w-100 bg-color-three rounded-pill h-4">
                                                        <div className="progress-bar bg-main-two-600 rounded-pill" style={{ width: `${Math.min(100, p.soldPercent || 0)}%` }} />
                                                    </div>
                                                    <span className="text-gray-900 text-xs fw-medium mt-4 block">
                                                        Sold: {p.sold || 0}/{p.stock || 0}
                                                    </span>
                                                </div>

                                                <div className="product-card__price mb-20">
                                                    {p.originalPrice && (
                                                        <span className="text-gray-400 text-md fw-semibold text-decoration-line-through">
                                                            ${Number(p.originalPrice).toFixed(2)}
                                                        </span>
                                                    )}
                                                    <span className="text-heading text-md fw-semibold ml-4">
                                                        ${Number(p.price || p.amount || 0).toFixed(2)}{' '}
                                                        <span className="text-gray-500 fw-normal">/Qty</span>
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleAddToCart(p)}
                                                className="btn bg-gray-50 text-heading hover-bg-main-two-600 hover-text-white py-11 px-24 rounded-8 flex-center gap-8 fw-medium w-100 transition-2 mt-auto"
                                            >
                                                Add to Cart <i className="ph ph-shopping-cart" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : !loadingProducts && (
                                <div className="col-span-full text-center py-40 text-gray-500">
                                    No products found.
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <ul className="pagination flex-center flex-wrap gap-16 mt-48">
                                <li className="page-item">
                                    <button onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1}
                                        className="page-link h-64 w-64 flex-center text-xxl rounded-8 fw-medium text-neutral-600 border border-gray-100 disabled:opacity-50">
                                        <i className="ph-bold ph-arrow-left" />
                                    </button>
                                </li>

                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                                    <li key={pageNum} className={`page-item ${pageNum === pagination.currentPage ? 'active' : ''}`}>
                                        <button onClick={() => handlePageChange(pageNum)}
                                            className={`page-link h-64 w-64 flex-center text-md rounded-8 fw-medium border border-gray-100 transition-2 ${pageNum === pagination.currentPage
                                                ? 'bg-main-two-600 text-white border-main-two-600'
                                                : 'text-neutral-600 hover:bg-main-two-600 hover:text-white hover:border-main-two-600'
                                                }`}>
                                            {pageNum < 10 ? `0${pageNum}` : pageNum}
                                        </button>
                                    </li>
                                ))}

                                <li className="page-item">
                                    <button onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages}
                                        className="page-link h-64 w-64 flex-center text-xxl rounded-8 fw-medium text-neutral-600 border border-gray-100 disabled:opacity-50">
                                        <i className="ph-bold ph-arrow-right" />
                                    </button>
                                </li>
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ShopSection