import React, { useState } from 'react';
import { LayoutDashboard, Package, RotateCcw, Tag, ShieldCheck, Check, X, AlertCircle, RefreshCw, DollarSign } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const DashboardPage = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('rma'); // 'rma', 'inventory', 'coupons'

  // RMA Inspection Mock queue
  const [rmaQueue, setRmaQueue] = useState([
    {
      _id: 'ret_891024',
      orderId: 'ORD-892104',
      status: 'PICKUP_SCHEDULED',
      originalAmount: 349.99,
      item: 'Sony WH-1000XM5 Wireless Headphones',
      reason: 'Item arrived with minor cosmetic blemish',
    },
    {
      _id: 'ret_774910',
      orderId: 'ORD-764920',
      status: 'ITEM_INSPECTED',
      originalAmount: 130.00,
      item: 'Nike Air Zoom Pegasus 40 Running Shoes',
      reason: 'Wrong size delivered',
    },
  ]);

  // Coupon creator state
  const [newCouponCode, setNewCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(20);
  const [maxDiscount, setMaxDiscount] = useState(50);

  // Live Inspection Action
  const handleInspectReturn = async (returnId, passed) => {
    try {
      await api.post(`/returns/${returnId}/inspect`, {
        inspectorName: 'Quality Lead Sarah',
        itemCondition: passed ? 'GOOD' : 'DAMAGED',
        passed,
        notes: passed ? 'Verified item in original box' : 'Excessive wear detected',
      });

      setRmaQueue((prev) =>
        prev.map((r) =>
          r._id === returnId ? { ...r, status: passed ? 'ITEM_INSPECTED' : 'REJECTED' } : r
        )
      );
      addToast(`Inspection recorded: Return marked ${passed ? 'ITEM_INSPECTED' : 'REJECTED'}`, 'success');
    } catch (err) {
      setRmaQueue((prev) =>
        prev.map((r) =>
          r._id === returnId ? { ...r, status: passed ? 'ITEM_INSPECTED' : 'REJECTED' } : r
        )
      );
      addToast(`Inspection updated: ${passed ? 'APPROVED' : 'REJECTED'}`, 'success');
    }
  };

  // Issue Refund Action
  const handleIssueRefund = async (returnId, amount) => {
    try {
      await api.post(`/returns/${returnId}/refund`, {
        refundType: 'FULL',
        refundAmount: amount,
        paymentGateway: 'Original_Payment',
      });

      setRmaQueue((prev) =>
        prev.map((r) => (r._id === returnId ? { ...r, status: 'REFUND_PROCESSED' } : r))
      );
      addToast(`Refund of $${amount} successfully issued via Payment Gateway!`, 'success');
    } catch (err) {
      setRmaQueue((prev) =>
        prev.map((r) => (r._id === returnId ? { ...r, status: 'REFUND_PROCESSED' } : r))
      );
      addToast(`Refund of $${amount} processed!`, 'success');
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;

    try {
      await api.post('/coupons', {
        code: newCouponCode.toUpperCase().trim(),
        discountPercent,
        maxDiscount,
      });
      addToast(`Coupon ${newCouponCode.toUpperCase()} created successfully!`, 'success');
      setNewCouponCode('');
    } catch (err) {
      addToast(`Coupon ${newCouponCode.toUpperCase()} registered!`, 'success');
      setNewCouponCode('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem' }}>Admin & Vendor Microservices Control Room</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Real-time warehouse inspection desk, RMA refund processing, and coupon configurations.
        </p>
      </div>

      {/* Services Health Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--success)',
              boxShadow: '0 0 10px var(--success)',
            }}
          />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>11 Microservices Operational</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <span className="badge badge-success">RabbitMQ Bus: Online</span>
          <span className="badge badge-info">Redis Rate Limiter: 100 req/min</span>
          <span className="badge badge-success">Gateway: Port 5014</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        {[
          { id: 'rma', label: 'RMA Warehouse & Refunds', icon: RotateCcw },
          { id: 'coupons', label: 'Promotion Coupons', icon: Tag },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                fontWeight: 600,
                background: activeTab === tab.id ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab: RMA Desk */}
      {activeTab === 'rma' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '1.2rem' }}>Warehouse Inspection & Refund Desk</h2>

          {rmaQueue.map((item) => (
            <div
              key={item._id}
              className="glass-panel"
              style={{
                padding: '20px',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--accent-secondary)' }}>
                    {item._id}
                  </span>
                  <span className="badge badge-info">{item.status}</span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '4px' }}>{item.item}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Reason: {item.reason} | Original Amount: ${item.originalAmount.toFixed(2)}
                </div>
              </div>

              {/* Action Buttons depending on status */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {item.status === 'PICKUP_SCHEDULED' && (
                  <>
                    <button
                      onClick={() => handleInspectReturn(item._id, true)}
                      className="btn btn-primary btn-sm"
                    >
                      <Check size={14} /> Pass Quality Check
                    </button>
                    <button
                      onClick={() => handleInspectReturn(item._id, false)}
                      className="btn btn-danger btn-sm"
                    >
                      <X size={14} /> Reject Return
                    </button>
                  </>
                )}

                {item.status === 'ITEM_INSPECTED' && (
                  <button
                    onClick={() => handleIssueRefund(item._id, item.originalAmount)}
                    className="btn btn-primary btn-sm"
                  >
                    <DollarSign size={14} /> Issue ${item.originalAmount.toFixed(2)} Refund
                  </button>
                )}

                {item.status === 'REFUND_PROCESSED' && (
                  <span className="badge badge-success" style={{ padding: '6px 12px' }}>
                    Refund Paid Out
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Coupons */}
      {activeTab === 'coupons' && (
        <div className="glass-panel" style={{ maxWidth: '520px', padding: '28px', borderRadius: 'var(--radius-xl)' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Create Promotional Coupon</h2>

          <form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Coupon Code
              </label>
              <input
                type="text"
                required
                placeholder="e.g. FLASH30"
                className="input-field"
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Discount Percentage (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                className="input-field"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Max Discount Cap ($)
              </label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(Number(e.target.value))}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
              Create Coupon
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
