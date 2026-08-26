import React from 'react';
import { ShoppingBag, Server, Shield, Cpu, GitFork, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer
      style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '48px 20px 24px',
        color: 'var(--text-secondary)',
        marginTop: 'auto',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '36px', marginBottom: '40px' }}>
          {/* Brand Col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShoppingBag size={18} color="#ffffff" />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                Nex<span className="gradient-text">Store</span>
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
              A high-performance distributed ecommerce microservices ecosystem featuring real-time inventory locking, asynchronous Saga transactions, ReAct AI shopping assistance, and automated RMA returns processing.
            </p>
          </div>

          {/* Microservices Architecture */}
          <div>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Server size={16} color="var(--accent-primary)" /> Microservices Architecture
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                'ApiGateway (5014)',
                'Product-Service (5009)',
                'Cart-Service (5010)',
                'Auth-Service (5011)',
                'Order-Service (5012)',
                'Payment-Service (5013)',
                'Inventory-Service (5016)',
                'Review-Service (5017)',
                'Refund-Service (5019)',
                'AI-Service (5018)',
                'Notification (5015)'
              ].map((svc) => (
                <span
                  key={svc}
                  style={{
                    fontSize: '0.72rem',
                    padding: '4px 8px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {svc}
                </span>
              ))}
            </div>
          </div>

          {/* Key Resiliency Features */}
          <div>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={16} color="var(--accent-secondary)" /> Resiliency & Core Tech
            </h4>
            <ul style={{ listStyle: 'none', fontSize: '0.85rem', lineHeight: 1.8, color: 'var(--text-muted)' }}>
              <li>✔ Redis Sliding-Window Rate Limiting</li>
              <li>✔ RabbitMQ Choreographed Event Bus</li>
              <li>✔ Dual-Phase Inventory Locking</li>
              <li>✔ Distributed Saga Compensations</li>
              <li>✔ AI ReAct Shopping Agent Tools</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>© {new Date().getFullYear()} NexStore Distributed Platform. All rights reserved.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            Built with React 19, Vite, Express & Microservices
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
