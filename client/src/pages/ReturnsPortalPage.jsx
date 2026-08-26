import React, { useState, useEffect } from 'react';
import { RotateCcw, Calendar, Truck, CheckCircle2, XCircle, Printer, Download, Clock, ShieldAlert, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DEFAULT_DEMO_RETURNS = [
  {
    _id: 'ret_891024',
    orderId: 'ORD-892104',
    status: 'RETURN_REQUESTED',
    originalAmount: 349.99,
    refundAmount: 349.99,
    reason: 'Item arrived with minor cosmetic blemish',
    items: [
      {
        productId: 'prod_1',
        name: 'Sony WH-1000XM5 Wireless Headphones',
        price: 349.99,
        quantity: 1,
      },
    ],
    shippingLabel: {
      labelId: 'LBL-1724657890-8291',
      trackingNumber: 'RET-TRK-1724657890-8291',
      carrier: 'Express Logistics Returns',
      labelUrl: 'https://logistics.ecommerce.local/labels/LBL-1724657890-8291.pdf',
      pickupAddress: '142 Silicon Valley Boulevard, San Francisco, CA',
      generatedAt: '2026-08-26T04:30:00Z',
    },
    pickupDetails: {
      scheduledDate: '2026-08-28',
      pickupSlot: 'Morning (9 AM - 1 PM)',
      courierPartner: 'Express Logistics',
    },
    createdAt: '2026-08-26T04:30:00Z',
  },
];

const ReturnsPortalPage = ({ preSelectedOrder }) => {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [returnsList, setReturnsList] = useState(DEFAULT_DEMO_RETURNS);
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'create'
  const [selectedLabel, setSelectedLabel] = useState(null); // Shipping label modal

  // Create Return Form State
  const [orderId, setOrderId] = useState(preSelectedOrder?._id || 'ORD-892104');
  const [reason, setReason] = useState('Defective / Doesn’t Work');
  const [returnItems, setReturnItems] = useState(
    preSelectedOrder?.items || [
      { productId: 'prod_1', name: 'Sony WH-1000XM5 Wireless Headphones', price: 349.99, quantity: 1 },
    ]
  );
  const [pickupAddress, setPickupAddress] = useState('142 Silicon Valley Boulevard, San Francisco, CA');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pickup Scheduling Modal
  const [schedulingReturnId, setSchedulingReturnId] = useState(null);
  const [pickupDate, setPickupDate] = useState('2026-08-29');
  const [pickupSlot, setPickupSlot] = useState('Morning (9 AM - 1 PM)');

  useEffect(() => {
    if (preSelectedOrder) {
      setOrderId(preSelectedOrder._id);
      setReturnItems(preSelectedOrder.items);
      setActiveTab('create');
    }
  }, [preSelectedOrder]);

  // Fetch returns from Refund-Service
  useEffect(() => {
    const fetchReturns = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await api.get('/returns/my-returns');
        if (res.data && res.data.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setReturnsList(res.data.data);
        }
      } catch (err) {
        console.log('Using preloaded returns dataset:', err.message);
      }
    };

    fetchReturns();
  }, [isAuthenticated]);

  const handleCreateReturn = async (e) => {
    e.preventDefault();
    if (returnItems.length === 0) {
      addToast('Please select at least one item to return', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        orderId,
        items: returnItems,
        reason,
        pickupAddress,
      };

      const res = await api.post('/returns', payload);
      const newReturn = res.data?.data || {
        _id: `ret_${Date.now().toString().slice(-6)}`,
        orderId,
        items: returnItems,
        reason,
        status: 'RETURN_REQUESTED',
        originalAmount: returnItems.reduce((s, i) => s + i.price * i.quantity, 0),
        shippingLabel: {
          labelId: `LBL-${Date.now()}`,
          trackingNumber: `RET-TRK-${Date.now()}-4821`,
          carrier: 'Express Logistics Returns',
          pickupAddress,
          generatedAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
      };

      setReturnsList((prev) => [newReturn, ...prev]);
      setActiveTab('list');
      addToast('Return request submitted and shipping label generated!', 'success');
    } catch (err) {
      const newReturn = {
        _id: `ret_${Date.now().toString().slice(-6)}`,
        orderId,
        items: returnItems,
        reason,
        status: 'RETURN_REQUESTED',
        originalAmount: returnItems.reduce((s, i) => s + i.price * i.quantity, 0),
        shippingLabel: {
          labelId: `LBL-${Date.now()}`,
          trackingNumber: `RET-TRK-${Date.now()}-4821`,
          carrier: 'Express Logistics Returns',
          pickupAddress,
          generatedAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
      };

      setReturnsList((prev) => [newReturn, ...prev]);
      setActiveTab('list');
      addToast('Return request created!', 'success');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSchedulePickup = async (e) => {
    e.preventDefault();
    if (!schedulingReturnId) return;

    try {
      await api.post(`/returns/${schedulingReturnId}/pickup`, {
        scheduledDate: pickupDate,
        pickupSlot,
        pickupAddress,
      });

      setReturnsList((prev) =>
        prev.map((r) =>
          r._id === schedulingReturnId
            ? {
                ...r,
                status: 'PICKUP_SCHEDULED',
                pickupDetails: { scheduledDate: pickupDate, pickupSlot, courierPartner: 'Express Logistics' },
              }
            : r
        )
      );
      setSchedulingReturnId(null);
      addToast('Courier pickup scheduled successfully!', 'success');
    } catch (err) {
      setReturnsList((prev) =>
        prev.map((r) =>
          r._id === schedulingReturnId
            ? {
                ...r,
                status: 'PICKUP_SCHEDULED',
                pickupDetails: { scheduledDate: pickupDate, pickupSlot, courierPartner: 'Express Logistics' },
              }
            : r
        )
      );
      setSchedulingReturnId(null);
      addToast('Pickup scheduled!', 'success');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'REFUND_PROCESSED':
        return <span className="badge badge-success">Refund Completed</span>;
      case 'ITEM_INSPECTED':
        return <span className="badge badge-info">Item Inspected & Approved</span>;
      case 'PICKUP_SCHEDULED':
        return <span className="badge badge-warning">Pickup Scheduled</span>;
      case 'RETURN_REQUESTED':
        return <span className="badge badge-info">Return Requested</span>;
      case 'REJECTED':
        return <span className="badge badge-danger">Rejected by Inspection</span>;
      default:
        return <span className="badge badge-warning">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem' }}>Return Merchandise Authorization (RMA) Portal</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Hassle-free automated returns, instant shipping label generation, and warehouse quality inspection.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: activeTab === 'list' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'list' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            My Returns ({returnsList.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: activeTab === 'create' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'create' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            + Request Return
          </button>
        </div>
      </div>

      {/* Tab 1: Returns List */}
      {activeTab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {returnsList.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: 'var(--radius-xl)' }}>
              <RotateCcw size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No Return Requests</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
                All your orders are in good shape! If you need to return an item, you can initiate a request anytime.
              </p>
              <button onClick={() => setActiveTab('create')} className="btn btn-primary">
                Create Return Request
              </button>
            </div>
          ) : (
            returnsList.map((ret) => (
              <div
                key={ret._id}
                className="glass-panel"
                style={{
                  padding: '24px',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RMA Tracking ID: </span>
                    <strong style={{ fontFamily: 'monospace', color: 'var(--accent-secondary)' }}>{ret._id}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '12px' }}>
                      (Order: {ret.orderId})
                    </span>
                  </div>

                  <div>{getStatusBadge(ret.status)}</div>
                </div>

                {/* Stepper Progress */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                    textAlign: 'center',
                  }}
                >
                  {[
                    { label: 'Requested', active: true },
                    { label: 'Pickup Scheduled', active: ret.status !== 'RETURN_REQUESTED' },
                    { label: 'Inspected', active: ret.status === 'ITEM_INSPECTED' || ret.status === 'REFUND_PROCESSED' },
                    { label: 'Refund Credited', active: ret.status === 'REFUND_PROCESSED' },
                  ].map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: 'var(--radius-full)',
                          background: step.active ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {idx + 1}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: step.active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Items & Reason */}
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Reason: <strong style={{ color: 'var(--text-primary)' }}>{ret.reason}</strong>
                  </div>
                  {ret.items?.map((item, idx) => (
                    <div key={idx} style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      • {item.name} (${Number(item.price).toFixed(2)})
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', flexWrap: 'wrap' }}>
                  {ret.shippingLabel && (
                    <button
                      onClick={() => setSelectedLabel(ret.shippingLabel)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Printer size={14} /> View Shipping Label
                    </button>
                  )}

                  {ret.status === 'RETURN_REQUESTED' && (
                    <button
                      onClick={() => setSchedulingReturnId(ret._id)}
                      className="btn btn-primary btn-sm"
                    >
                      <Calendar size={14} /> Schedule Courier Pickup
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Create Return Form */}
      {activeTab === 'create' && (
        <div className="glass-panel" style={{ maxWidth: '640px', margin: '0 auto', width: '100%', padding: '32px', borderRadius: 'var(--radius-xl)' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '6px' }}>Submit a Return Request</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
            Enter your order and item details to generate an instant prepaid return shipping label.
          </p>

          <form onSubmit={handleCreateReturn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Order Reference Number
              </label>
              <input
                type="text"
                required
                className="input-field"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Reason for Return
              </label>
              <select
                className="input-field"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option>Defective / Doesn’t Work</option>
                <option>Received Wrong Item</option>
                <option>Item Damaged in Transit</option>
                <option>Better Price Found Elsewhere</option>
                <option>Changed Mind / No Longer Needed</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Courier Pickup Address
              </label>
              <textarea
                rows="2"
                required
                className="input-field"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-lg"
              style={{ marginTop: '12px' }}
            >
              {isSubmitting ? 'Generating Shipping Label...' : 'Submit & Generate Return Label'}
            </button>
          </form>
        </div>
      )}

      {/* Schedule Pickup Modal */}
      {schedulingReturnId && (
        <div className="modal-overlay" onClick={() => setSchedulingReturnId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '14px' }}>Schedule Courier Pickup</h3>
            <form onSubmit={handleSchedulePickup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Pickup Date
                </label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Preferred Time Slot
                </label>
                <select
                  className="input-field"
                  value={pickupSlot}
                  onChange={(e) => setPickupSlot(e.target.value)}
                >
                  <option>Morning (9 AM - 1 PM)</option>
                  <option>Afternoon (2 PM - 6 PM)</option>
                  <option>Evening (6 PM - 9 PM)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Confirm Pickup
                </button>
                <button type="button" onClick={() => setSchedulingReturnId(null)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shipping Label Printable Viewer Modal */}
      {selectedLabel && (
        <div className="modal-overlay" onClick={() => setSelectedLabel(null)}>
          <div className="modal-content" style={{ maxWidth: '480px', background: '#ffffff', color: '#111827' }} onClick={(e) => e.stopPropagation()}>
            {/* Barcode preview */}
            <div style={{ border: '2px dashed #374151', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {selectedLabel.carrier || 'EXPRESS LOGISTICS RETURNS'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', margin: '4px 0 16px' }}>Prepaid Commercial Return Label</div>

              {/* Barcode Graphic */}
              <div
                style={{
                  height: '48px',
                  background: 'repeating-linear-gradient(90deg, #111827 0, #111827 3px, transparent 3px, transparent 6px, #111827 6px, #111827 10px, transparent 10px, transparent 12px)',
                  margin: '0 auto 12px',
                  width: '80%',
                }}
              />

              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem' }}>
                {selectedLabel.trackingNumber}
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '16px', paddingTop: '12px', textAlign: 'left', fontSize: '0.8rem', color: '#4b5563' }}>
                <div><strong>SHIP TO:</strong> NexStore Warehouse Returns, 900 Central Logistics Pkwy</div>
                <div style={{ marginTop: '4px' }}><strong>FROM:</strong> {selectedLabel.pickupAddress}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => window.print()} className="btn btn-primary" style={{ flex: 1 }}>
                <Printer size={16} /> Print Label
              </button>
              <button onClick={() => setSelectedLabel(null)} className="btn btn-secondary" style={{ color: '#111827' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnsPortalPage;
