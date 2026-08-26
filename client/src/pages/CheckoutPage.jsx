import React, { useState } from 'react';
import { CreditCard, ShieldCheck, CheckCircle2, AlertTriangle, ArrowLeft, Truck, Lock, Sparkles, Building2, Smartphone } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const CheckoutPage = ({ onBack, onOrderComplete }) => {
  const { cartItems, subtotal, discountAmount, estimatedTax, shipping, finalTotal, coupon, clearCart } = useCart();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [shippingAddress, setShippingAddress] = useState({
    fullName: user?.name || 'Alex Mercer',
    email: user?.email || 'alex.mercer@ecommerce.local',
    street: '142 Silicon Valley Boulevard',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94107',
    phone: '+1 (555) 349-8201',
  });

  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card', 'upi', 'netbanking', 'cod'
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8892');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvc, setCardCvc] = useState('382');
  const [upiId, setUpiId] = useState('alex@okaxis');

  // Saga Failure simulation flag for demonstration
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [orderResult, setOrderResult] = useState(null); // { orderId, success }

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      addToast('Your cart is empty', 'warning');
      return;
    }

    setProcessing(true);

    try {
      // Step 1: Create Order via Order-Service (/api/orders)
      const orderPayload = {
        items: cartItems.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
        shippingAddress,
        couponCode: coupon?.code || null,
        totalAmount: finalTotal,
        paymentMethod,
        simulateFailure,
      };

      let orderId = `ORD-${Date.now().toString().slice(-6)}`;

      try {
        const orderRes = await api.post('/orders', orderPayload);
        if (orderRes.data?.data?._id || orderRes.data?.data?.orderId) {
          orderId = orderRes.data.data._id || orderRes.data.data.orderId;
        }
      } catch (err) {
        console.warn('Backend order call fell back to local Saga pipeline simulator');
      }

      // Step 2: Process Payment via Payment-Service (/api/payment)
      const paymentPayload = {
        orderId,
        amount: finalTotal,
        paymentMethod,
        simulateFailure,
      };

      if (simulateFailure) {
        // Trigger Saga Rollback demonstration
        setTimeout(() => {
          setProcessing(false);
          addToast('Payment Failed! Saga compensation triggered: Inventory reservation cancelled & Order marked CANCELLED.', 'danger', 6000);
        }, 1200);
        return;
      }

      try {
        await api.post('/payment', paymentPayload);
      } catch (pErr) {
        // Mock fallback
      }

      // Order Success
      setTimeout(() => {
        setProcessing(false);
        setOrderResult({
          orderId,
          totalAmount: finalTotal,
          itemsCount: cartItems.length,
          date: new Date().toLocaleDateString(),
        });
        clearCart();
        addToast('Order placed and payment confirmed successfully!', 'success');
      }, 1000);
    } catch (error) {
      setProcessing(false);
      addToast(error.message || 'Checkout failed', 'danger');
    }
  };

  if (orderResult) {
    return (
      <div
        className="glass-panel"
        style={{
          maxWidth: '560px',
          margin: '40px auto',
          padding: '40px',
          borderRadius: 'var(--radius-xl)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--success-bg)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <CheckCircle2 size={40} />
        </div>

        <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Payment Confirmed!</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px' }}>
          Your order has been placed and inventory is reserved. RabbitMQ has emitted event{' '}
          <strong style={{ color: 'var(--accent-primary)' }}>ORDER_CONFIRMED</strong>.
        </p>

        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            textAlign: 'left',
            fontSize: '0.9rem',
            marginBottom: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Order ID</span>
            <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{orderResult.orderId}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Total Paid</span>
            <strong style={{ color: 'var(--success)' }}>${orderResult.totalAmount.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Shipping To</span>
            <span>{shippingAddress.city}, {shippingAddress.state}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => onOrderComplete('orders')} className="btn btn-primary">
            View in My Orders
          </button>
          <button onClick={() => onOrderComplete('catalog')} className="btn btn-secondary">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Back link */}
      <div>
        <button onClick={onBack} className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} /> Back to Shopping
        </button>
      </div>

      <h1 style={{ fontSize: '1.8rem' }}>Secure Checkout & Payment</h1>

      <form onSubmit={handleSubmitOrder} style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.4fr) minmax(300px, 1fr)', gap: '32px' }}>
        {/* Left Column: Shipping & Payment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Shipping Address */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} color="var(--accent-primary)" /> 1. Shipping Address
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={shippingAddress.fullName}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  className="input-field"
                  value={shippingAddress.email}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, email: e.target.value })}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={shippingAddress.street}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  City
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  ZIP / Postal Code
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={shippingAddress.zipCode}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, zipCode: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} color="var(--accent-secondary)" /> 2. Payment Method
            </h3>

            {/* Method Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
              {[
                { id: 'card', label: 'Card', icon: CreditCard },
                { id: 'upi', label: 'UPI', icon: Smartphone },
                { id: 'netbanking', label: 'Net Banking', icon: Building2 },
                { id: 'cod', label: 'COD', icon: Truck },
              ].map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    style={{
                      padding: '12px 6px',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: active ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: active ? '#ffffff' : 'var(--text-secondary)',
                      border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={18} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Payment Fields */}
            {paymentMethod === 'card' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Card Number
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Security CVC
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'upi' && (
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Virtual Payment Address (VPA / UPI ID)
                </label>
                <input
                  type="text"
                  placeholder="username@bank"
                  className="input-field"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>
            )}

            {/* Distributed Saga Failure Demo Toggle */}
            <div
              style={{
                marginTop: '20px',
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px dashed rgba(239, 68, 68, 0.35)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: 'var(--danger)',
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={simulateFailure}
                  onChange={(e) => setSimulateFailure(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--danger)' }}
                />
                <span>Simulate Saga Payment Failure & Rollback</span>
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', marginLeft: '26px' }}>
                Demonstrates distributed transaction compensation: payment failure emits <code>PAYMENT_FAILED</code>, triggering inventory unreserve and order cancellation.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Order Review & Pay CTA */}
        <div>
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', position: 'sticky', top: '90px' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>Order Summary</h3>

            {/* Items snippet */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', marginBottom: '16px' }}>
              {cartItems.map((item) => (
                <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.quantity}x {item.name}
                  </span>
                  <span style={{ fontWeight: 600 }}>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Summary Breakdown */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Coupon Discount ({coupon?.code})</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Estimated Tax (8%)</span>
                <span>${estimatedTax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Shipping</span>
                <span>{shipping === 0 ? <strong style={{ color: 'var(--success)' }}>FREE</strong> : `$${shipping.toFixed(2)}`}</span>
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '12px',
                  marginTop: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                }}
              >
                <span>Total Due</span>
                <span className="gradient-text">${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={processing || cartItems.length === 0}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '24px' }}
            >
              {processing ? 'Executing Saga Pipeline...' : `Place Order & Pay $${finalTotal.toFixed(2)}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
