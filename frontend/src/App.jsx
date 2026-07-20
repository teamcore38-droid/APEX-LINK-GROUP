import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import CategoriesPage from './pages/CategoriesPage'
import CategoryPage from './pages/CategoryPage'
import CartPage from './pages/CartPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AboutPage from './pages/AboutPage'
import NotFoundPage from './pages/NotFoundPage'
import RouteLoadingScreen from './components/RouteLoadingScreen'
import CookieConsentBanner from './components/CookieConsentBanner'
import ScrollToTop from './components/ScrollToTop'
import SitePreloader from './components/SitePreloader'

const CHUNK_RELOAD_KEY = 'apex-link-chunk-reload'

const lazyWithReload = (loader) =>
  lazy(() =>
    loader()
      .then((module) => {
        window.sessionStorage.removeItem(CHUNK_RELOAD_KEY)
        return module
      })
      .catch((error) => {
        if (!window.sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
          window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
          window.location.reload()
          return new Promise(() => {})
        }

        window.sessionStorage.removeItem(CHUNK_RELOAD_KEY)
        throw error
      })
  )

const ProductPage = lazyWithReload(() => import('./pages/ProductPage'))
const CheckoutPage = lazyWithReload(() => import('./pages/CheckoutPage'))
const ProfilePage = lazyWithReload(() => import('./pages/ProfilePage'))
const ForgotPasswordPage = lazyWithReload(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazyWithReload(() => import('./pages/ResetPasswordPage'))
const TrackOrderPage = lazyWithReload(() => import('./pages/TrackOrderPage'))
const ContactPage = lazyWithReload(() => import('./pages/ContactPage'))
const FAQPage = lazyWithReload(() => import('./pages/FAQPage'))
const TermsPage = lazyWithReload(() => import('./pages/TermsPage'))
const PrivacyPage = lazyWithReload(() => import('./pages/PrivacyPage'))
const ReturnsPage = lazyWithReload(() => import('./pages/ReturnsPage'))
const ShippingPage = lazyWithReload(() => import('./pages/ShippingPage'))
const AdminDashboard = lazyWithReload(() => import('./pages/AdminDashboard'))
const AdminCategoriesPage = lazyWithReload(() => import('./pages/AdminCategoriesPage'))
const AdminMessagesPage = lazyWithReload(() => import('./pages/AdminMessagesPage'))
const AdminCommercePage = lazyWithReload(() => import('./pages/AdminCommercePage'))
const AdminVendorsPage = lazyWithReload(() => import('./pages/AdminVendorsPage'))
const AdminProfessionalPage = lazyWithReload(() => import('./pages/AdminProfessionalPage'))
const AdminMobilePage = lazyWithReload(() => import('./pages/AdminMobilePage'))
const VendorOnboardingPage = lazyWithReload(() => import('./pages/VendorOnboardingPage'))
const VendorDashboardPage = lazyWithReload(() => import('./pages/VendorDashboardPage'))
const RFQPage = lazyWithReload(() => import('./pages/RFQPage'))
const CustomerExperiencePage = lazyWithReload(() => import('./pages/CustomerExperiencePage'))
const PrivacyCenterPage = lazyWithReload(() => import('./pages/PrivacyCenterPage'))
const AddProductPage = lazyWithReload(() => import('./pages/AddProductPage'))
const EditProductPage = lazyWithReload(() => import('./pages/EditProductPage'))
const OrderSuccessPage = lazyWithReload(() => import('./pages/OrderSuccessPage'))
const OrderInvoicePage = lazyWithReload(() => import('./pages/OrderInvoicePage'))
const AdminOrderDetailPage = lazyWithReload(() => import('./pages/AdminOrderDetailPage'))
const AdminPackingSlipPage = lazyWithReload(() => import('./pages/AdminPackingSlipPage'))
const AdminShippingPage = lazyWithReload(() => import('./pages/AdminShippingPage'))

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <SitePreloader />
      <ScrollToTop />
      <Header />
      <main className="flex-grow">
        <Suspense fallback={<RouteLoadingScreen />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/shop" element={<Navigate to="/products" replace />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/account" element={<ProfilePage />} />
            <Route path="/track-order" element={<TrackOrderPage />} />
            <Route path="/rfq" element={<RFQPage />} />
            <Route path="/customer-experience" element={<CustomerExperiencePage />} />
            <Route path="/vendor/onboarding" element={<VendorOnboardingPage />} />
            <Route path="/vendor/dashboard" element={<VendorDashboardPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/privacy-center" element={<PrivacyCenterPage />} />
            <Route path="/returns" element={<ReturnsPage />} />
            <Route path="/shipping" element={<ShippingPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
            <Route path="/admin/messages" element={<AdminMessagesPage />} />
            <Route path="/admin/commerce" element={<AdminCommercePage />} />
            <Route path="/admin/shipping" element={<AdminShippingPage />} />
            <Route path="/admin/vendors" element={<AdminVendorsPage />} />
            <Route path="/admin/professional" element={<AdminProfessionalPage />} />
            <Route path="/admin/mobile" element={<AdminMobilePage />} />
            <Route path="/admin/products/new" element={<AddProductPage />} />
            <Route path="/admin/product/:id/edit" element={<EditProductPage />} />
            <Route path="/order/:id/confirm" element={<OrderSuccessPage />} />
            <Route path="/orders/:id" element={<OrderSuccessPage />} />
            <Route path="/orders/:id/invoice" element={<OrderInvoicePage />} />
            <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
            <Route path="/admin/orders/:id/invoice" element={<OrderInvoicePage />} />
            <Route path="/admin/orders/:id/packing-slip" element={<AdminPackingSlipPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <CookieConsentBanner />
    </div>
  )
}

export default App
