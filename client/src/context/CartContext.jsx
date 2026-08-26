import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('nexstore_guest_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [coupon, setCoupon] = useState(null); // { code, discountAmount, discountPercent }
  const [loading, setLoading] = useState(false);

  // Fetch cart from backend if authenticated
  const fetchBackendCart = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await api.get('/cart');
      if (res.data && res.data.data && Array.isArray(res.data.data.items)) {
        setCartItems(res.data.data.items);
      }
    } catch (err) {
      console.warn('Could not fetch backend cart, using local cache:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBackendCart();
    }
  }, [isAuthenticated, fetchBackendCart]);

  // Sync guest cart to localStorage
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('nexstore_guest_cart', JSON.stringify(cartItems));
    }
  }, [cartItems, isAuthenticated]);

  const addToCart = async (product, quantity = 1) => {
    const itemToAdd = {
      productId: product._id || product.id || product.productId,
      name: product.name || product.title,
      price: product.price,
      image: product.image || product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
      quantity,
    };

    // Optimistic UI update
    setCartItems((prev) => {
      const existing = prev.find((item) => String(item.productId) === String(itemToAdd.productId));
      if (existing) {
        return prev.map((item) =>
          String(item.productId) === String(itemToAdd.productId)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, itemToAdd];
    });

    addToast(`Added ${itemToAdd.name} to cart!`, 'success');
    setIsDrawerOpen(true);

    if (isAuthenticated) {
      try {
        await api.post('/cart/add', itemToAdd);
      } catch (err) {
        console.warn('Backend cart sync error:', err.message);
      }
    }
  };

  const updateQuantity = async (productId, newQty) => {
    if (newQty <= 0) {
      return removeFromCart(productId);
    }

    setCartItems((prev) =>
      prev.map((item) =>
        String(item.productId) === String(productId) ? { ...item, quantity: newQty } : item
      )
    );

    if (isAuthenticated) {
      try {
        await api.put('/cart/update', { productId, quantity: newQty });
      } catch (err) {
        console.warn('Backend cart update error:', err.message);
      }
    }
  };

  const removeFromCart = async (productId) => {
    setCartItems((prev) => prev.filter((item) => String(item.productId) !== String(productId)));
    addToast('Item removed from cart', 'info');

    if (isAuthenticated) {
      try {
        await api.delete(`/cart/item/${productId}`);
      } catch (err) {
        console.warn('Backend cart item delete error:', err.message);
      }
    }
  };

  const clearCart = async () => {
    setCartItems([]);
    setCoupon(null);
    localStorage.removeItem('nexstore_guest_cart');

    if (isAuthenticated) {
      try {
        await api.delete('/cart/clear');
      } catch (err) {
        console.warn('Backend cart clear error:', err.message);
      }
    }
  };

  const applyCoupon = async (code) => {
    if (!code || !code.trim()) {
      addToast('Please enter a coupon code', 'warning');
      return;
    }

    const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    try {
      const res = await api.post('/coupons/apply', {
        couponCode: code.toUpperCase().trim(),
        orderAmount: subtotal,
      });

      if (res.data && res.data.success) {
        const { discountAmount, discountPercent, code: appliedCode } = res.data.data;
        setCoupon({
          code: appliedCode || code.toUpperCase(),
          discountAmount: discountAmount || 0,
          discountPercent: discountPercent || 0,
        });
        addToast(`Coupon ${code.toUpperCase()} applied successfully!`, 'success');
      }
    } catch (error) {
      // Fallback local promo calculation for popular demo codes
      const upper = code.toUpperCase().trim();
      if (upper === 'SAVE20') {
        const discount = Number((subtotal * 0.2).toFixed(2));
        setCoupon({ code: 'SAVE20', discountAmount: discount, discountPercent: 20 });
        addToast('Promo code SAVE20 applied (20% off)!', 'success');
      } else if (upper === 'FLAT50') {
        const discount = Math.min(50, subtotal);
        setCoupon({ code: 'FLAT50', discountAmount: discount, discountPercent: 0 });
        addToast('Promo code FLAT50 applied ($50 off)!', 'success');
      } else {
        const msg = error.response?.data?.message || 'Invalid or expired coupon code';
        addToast(msg, 'danger');
      }
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    addToast('Coupon removed', 'info');
  };

  // Computations
  const totalCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const subtotal = Number(cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));
  const discountAmount = coupon ? Number(coupon.discountAmount.toFixed(2)) : 0;
  const estimatedTax = Number((Math.max(0, subtotal - discountAmount) * 0.08).toFixed(2)); // 8% tax
  const shipping = subtotal > 100 || subtotal === 0 ? 0 : 9.99; // Free shipping over $100
  const finalTotal = Number(Math.max(0, subtotal - discountAmount + estimatedTax + shipping).toFixed(2));

  return (
    <CartContext.Provider
      value={{
        cartItems,
        totalCount,
        subtotal,
        discountAmount,
        estimatedTax,
        shipping,
        finalTotal,
        coupon,
        isDrawerOpen,
        loading,
        setIsDrawerOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
