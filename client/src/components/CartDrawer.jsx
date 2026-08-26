import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Tag, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const CartDrawer = ({ onNavigateToCheckout }) => {
  const {
    cartItems,
    isDrawerOpen,
    setIsDrawerOpen,
    updateQuantity,
    removeFromCart,
    subtotal,
    discountAmount,
    estimatedTax,
    shipping,
    finalTotal,
    coupon,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const { isAuthenticated, openAuthModal } = useAuth();
  const [couponInput, setCouponInput] = useState('');

  if (!isDrawerOpen) return null;

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    applyCoupon(couponInput);
    setCouponInput('');
  };

  const handleProceedCheckout = () => {
    setIsDrawerOpen(false);
    if (!isAuthenticated) {
      openAuthModal('signin');
    } else {
      onNavigateToCheckout();
    }
  };

  return (
    <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.15rem' }}>Your Shopping Cart</h3>
            <span
              style={{
                fontSize: '0.8rem',
                background: 'var(--bg-tertiary)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-muted)',
              }}
            >
              {cartItems.length} items
            </span>
          </div>

          <button onClick={() => setIsDrawerOpen(false)} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Cart Item List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto 0', color: 'var(--text-muted)' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <ShoppingBag size={32} />
              </div>
              <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '6px' }}>Your cart is empty</h4>
              <p style={{ fontSize: '0.85rem', marginBottom: '20px' }}>Discover amazing products and add them to your cart.</p>
              <button onClick={() => setIsDrawerOpen(false)} className="btn btn-primary btn-sm">
                Start Shopping
              </button>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.productId}
                style={{
                  display: 'flex',
                  gap: '14px',
                  padding: '12px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* Item Image */}
                <img
                  src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                  alt={item.name}
                  style={{
                    width: '64px',
                    height: '64px',
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-secondary)',
                  }}
                />

                {/* Details */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2, maxWidth: '180px' }}>
                      {item.name}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      style={{ color: 'var(--danger)', opacity: 0.8 }}
                      title="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>

                    {/* Quantity controls */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'var(--bg-secondary)',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Summary */}
        {cartItems.length > 0 && (
          <div
            style={{
              padding: '20px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* Promo Code Input */}
            <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Tag size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Coupon code (e.g. SAVE20)"
                  className="input-field"
                  style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }}>
                Apply
              </button>
            </form>

            {/* Applied Coupon Tag */}
            {coupon && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--success-bg)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  color: 'var(--success)',
                }}
              >
                <span>
                  Code <strong>{coupon.code}</strong> applied (-${coupon.discountAmount.toFixed(2)})
                </span>
                <button onClick={removeCoupon} style={{ color: 'var(--danger)' }}>
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Estimated Tax (8%)</span>
                <span>${estimatedTax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Shipping</span>
                <span>{shipping === 0 ? <strong style={{ color: 'var(--success)' }}>FREE</strong> : `$${shipping.toFixed(2)}`}</span>
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '8px',
                  marginTop: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                <span>Total</span>
                <span>${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button onClick={handleProceedCheckout} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              Proceed to Checkout <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
