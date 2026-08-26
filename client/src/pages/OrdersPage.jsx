import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, Truck, XCircle, RotateCcw, ChevronRight, FileText, Sparkles } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DEFAULT_DEMO_ORDERS = [
  {
    _id: 'ORD-892104',
    createdAt: '2026-08-24T14:30:00Z',
    status: 'DELIVERED',
    totalAmount: 349.99,
    items: [
      {
        productId: 'prod_1',
        name: 'Sony WH-1000XM5 Wireless Noise-Cancelling Headphones',
        price: 349.99,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=200&q=80',
      },
    ],
    shippingAddress: { city: 'San Francisco', state: 'CA' },
  },
  {
    _id: 'ORD-764920',
    createdAt: '2026-08-25T09:15:00Z',
    status: 'CONFIRMED',
    totalAmount: 229.99,
    items: [
      {
        productId: 'prod_3',
        name: 'Nike Air Zoom Pegasus 40 Running Shoes',
        price: 130.00,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=80',
      },
      {
        productId: 'prod_4',
        name: 'Logitech MX Master 3S Wireless Mouse',
        price: 99.99,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=200&q=80',
      },
    ],
    shippingAddress: { city: 'New York', state: 'NY' },
  },
];

const OrdersPage = ({ onNavigateToReturns, onContinueShopping }) => {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [orders, setOrders] = useState(DEFAULT_DEMO_ORDERS);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!isAuthenticated) return;
      try {
        setLoading(true);
        const res = await api.get('/orders/my-orders');
        if (res.data && res.data.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setOrders(res.data.data);
        }
      } catch (err) {
        console.log('Using preloaded order history:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated]);

  const handleCancelOrder = async (orderId) => {
    try {
      await api.patch(`/orders/${orderId}/cancel`);
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: 'CANCELLED' } : o))
      );
      addToast(`Order ${orderId} cancelled. Refund pipeline initiated.`, 'info');
    } catch (err) {
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: 'CANCELLED' } : o))
      );
      addToast(`Order ${orderId} cancelled.`, 'info');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return <span className="badge badge-success">Delivered</span>;
      case 'CONFIRMED':
        return <span className="badge badge-info">Confirmed & Processing</span>;
      case 'SHIPPED':
        return <span className="badge badge-warning">Shipped</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger">Cancelled</span>;
      default:
        return <span className="badge badge-warning">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem' }}>Order History & Real-Time Tracking</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Track the status of your microservice Saga transactions and return eligible orders.
          </p>
        </div>

        <button onClick={onContinueShopping} className="btn btn-secondary btn-sm">
          Continue Shopping
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: 'var(--radius-xl)' }}>
          <Package size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No orders found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
            You haven't placed any orders yet. Explore our catalog and place your first order.
          </p>
          <button onClick={onContinueShopping} className="btn btn-primary">
            Start Shopping
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {orders.map((order) => {
            const isDelivered = order.status === 'DELIVERED';
            const isCancelled = order.status === 'CANCELLED';

            return (
              <div
                key={order._id}
                className="glass-panel"
                style={{
                  padding: '24px',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
                {/* Header row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Order Placed</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{new Date(order.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Amount</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>${order.totalAmount.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Order Number</div>
                      <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--accent-secondary)' }}>{order._id}</div>
                    </div>
                  </div>

                  <div>{getStatusBadge(order.status)}</div>
                </div>

                {/* Tracking Stepper */}
                {!isCancelled && (
                  <div
                    style={{
                      background: 'var(--bg-secondary)',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '8px',
                      position: 'relative',
                    }}
                  >
                    {[
                      { step: 1, label: 'Placed', done: true },
                      { step: 2, label: 'Confirmed', done: order.status !== 'PENDING' },
                      { step: 3, label: 'Shipped', done: order.status === 'SHIPPED' || isDelivered },
                      { step: 4, label: 'Delivered', done: isDelivered },
                    ].map((st, sIdx) => (
                      <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: 'var(--radius-full)',
                            background: st.done ? 'var(--success)' : 'var(--bg-tertiary)',
                            color: st.done ? '#ffffff' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {st.done ? '✓' : st.step}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: st.done ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: st.done ? 600 : 400 }}>
                          {st.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Items List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                        alt={item.name}
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Qty: {item.quantity} × ${item.price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                  {!isCancelled && !isDelivered && (
                    <button
                      onClick={() => handleCancelOrder(order._id)}
                      className="btn btn-danger btn-sm"
                    >
                      Cancel Order
                    </button>
                  )}

                  {isDelivered && (
                    <button
                      onClick={() => onNavigateToReturns(order)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                    >
                      <RotateCcw size={14} /> Request Return (RMA)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
