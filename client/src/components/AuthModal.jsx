import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Mail, User, ShieldCheck } from 'lucide-react';

const AuthModal = () => {
  const { isAuthModalOpen, authModalMode, closeAuthModal, openAuthModal, signin, signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo.customer@ecommerce.local');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState('customer');
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const isSignIn = authModalMode === 'signin';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isSignIn) {
      await signin(email, password);
    } else {
      await signup({ name, email, password, role });
    }

    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={closeAuthModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.4rem' }}>{isSignIn ? 'Sign In to NexStore' : 'Create an Account'}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              {isSignIn ? 'Access your orders, cart, and AI assistant' : 'Join the next-gen microservice platform'}
            </p>
          </div>
          <button onClick={closeAuthModal} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isSignIn && (
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  placeholder="Alex Mercer"
                  className="input-field"
                  style={{ paddingLeft: '42px' }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                required
                placeholder="name@domain.com"
                className="input-field"
                style={{ paddingLeft: '42px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                className="input-field"
                style={{ paddingLeft: '42px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {!isSignIn && (
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Select Role
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {['customer', 'vendor', 'admin'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      background: role === r ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                      color: role === r ? '#ffffff' : 'var(--text-secondary)',
                      border: `1px solid ${role === r ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px', padding: '12px' }}
          >
            {loading ? 'Processing...' : isSignIn ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle Mode */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {isSignIn ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => openAuthModal('signup')}
                style={{ color: 'var(--accent-primary)', fontWeight: 600 }}
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => openAuthModal('signin')}
                style={{ color: 'var(--accent-primary)', fontWeight: 600 }}
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
