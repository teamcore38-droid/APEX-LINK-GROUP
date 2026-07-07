import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
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

const ProductPage = lazy(() => import('./pages/ProductPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const FAQPage = lazy(() => import('./pages/FAQPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const ReturnsPage = lazy(() => import('./pages/ReturnsPage'))
const ShippingPage = lazy(() => import('./pages/ShippingPage'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminCategoriesPage = lazy(() => import('./pages/AdminCategoriesPage'))
const AdminMessagesPage = lazy(() => import('./pages/AdminMessagesPage'))
const AddProductPage = lazy(() => import('./pages/AddProductPage'))
const EditProductPage = lazy(() => import('./pages/EditProductPage'))
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'))
const OrderInvoicePage = lazy(() => import('./pages/OrderInvoicePage'))
const AdminOrderDetailPage = lazy(() => import('./pages/AdminOrderDetailPage'))
const AdminPackingSlipPage = lazy(() => import('./pages/AdminPackingSlipPage'))

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Suspense fallback={<RouteLoadingScreen />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
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
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/returns" element={<ReturnsPage />} />
            <Route path="/shipping" element={<ShippingPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
            <Route path="/admin/messages" element={<AdminMessagesPage />} />
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
    </div>
  )
}

export default App
