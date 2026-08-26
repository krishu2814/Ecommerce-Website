import React, { useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import Toast from './components/Toast';
import AuthModal from './components/AuthModal';
import AIAssistantModal from './components/AIAssistantModal';

import CatalogPage from './pages/CatalogPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import ReturnsPortalPage from './pages/ReturnsPortalPage';
import DashboardPage from './pages/DashboardPage';

const AppContent = () => {
  const [currentPage, setCurrentPage] = useState('catalog'); // 'catalog', 'detail', 'checkout', 'orders', 'returns', 'dashboard'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [preSelectedOrder, setPreSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAIOpen, setIsAIOpen] = useState(false);

  const navigateTo = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    navigateTo('detail');
  };

  const handleNavigateToReturns = (order) => {
    setPreSelectedOrder(order);
    navigateTo('returns');
  };

  return (
    <div className="app-container">
      {/* Global Navbar */}
      <Navbar
        currentPage={currentPage}
        onNavigate={navigateTo}
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
        onOpenAI={() => setIsAIOpen(true)}
      />

      {/* Main Page Body */}
      <main className="main-content">
        {currentPage === 'catalog' && (
          <CatalogPage
            onSelectProduct={handleSelectProduct}
            searchQuery={searchQuery}
            onOpenAI={() => setIsAIOpen(true)}
          />
        )}

        {currentPage === 'detail' && selectedProduct && (
          <ProductDetailPage
            product={selectedProduct}
            onBack={() => navigateTo('catalog')}
          />
        )}

        {currentPage === 'checkout' && (
          <CheckoutPage
            onBack={() => navigateTo('catalog')}
            onOrderComplete={(targetPage) => navigateTo(targetPage)}
          />
        )}

        {currentPage === 'orders' && (
          <OrdersPage
            onNavigateToReturns={handleNavigateToReturns}
            onContinueShopping={() => navigateTo('catalog')}
          />
        )}

        {currentPage === 'returns' && (
          <ReturnsPortalPage
            preSelectedOrder={preSelectedOrder}
          />
        )}

        {currentPage === 'dashboard' && (
          <DashboardPage />
        )}
      </main>

      {/* Slide-Over Cart Drawer */}
      <CartDrawer onNavigateToCheckout={() => navigateTo('checkout')} />

      {/* Floating AI Shopping Assistant Modal */}
      <AIAssistantModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        onSelectProduct={handleSelectProduct}
      />

      {/* Auth Modal (Sign In / Sign Up) */}
      <AuthModal />

      {/* Global Toast Alert Notifications */}
      <Toast />

      {/* Footer */}
      <Footer />
    </div>
  );
};

function App() {
  return (
    <ToastProvider>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </ToastProvider>
  );
}

export default App;
