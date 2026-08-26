import React, { useState } from 'react';
import { ShoppingBag, Search, Sun, Moon, Sparkles, User as UserIcon, LogOut, Package, RotateCcw, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = ({ currentPage, onNavigate, onSearch, searchQuery, onOpenAI }) => {
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const { totalCount, setIsDrawerOpen } = useCart();
  const { theme, toggleTheme } = useTheme();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 800,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
        }}
      >
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate('catalog')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <ShoppingBag size={20} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', lineHeight: 1.1 }}>
              Nex<span className="gradient-text">Store</span>
            </h2>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Microservices Core
            </span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div style={{ flex: '1', maxWidth: '420px', position: 'relative' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search products, brands, electronics..."
            className="input-field"
            style={{ paddingLeft: '42px', paddingRight: '14px', height: '42px', fontSize: '0.9rem' }}
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        {/* Navigation Actions */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Shop */}
          <button
            onClick={() => onNavigate('catalog')}
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              color: currentPage === 'catalog' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: currentPage === 'catalog' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            }}
          >
            Catalog
          </button>

          {/* Orders */}
          <button
            onClick={() => {
              if (!isAuthenticated) openAuthModal('signin');
              else onNavigate('orders');
            }}
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              color: currentPage === 'orders' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: currentPage === 'orders' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            }}
          >
            Orders
          </button>

          {/* Returns & RMA */}
          <button
            onClick={() => {
              if (!isAuthenticated) openAuthModal('signin');
              else onNavigate('returns');
            }}
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              color: currentPage === 'returns' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: currentPage === 'returns' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            }}
          >
            Returns
          </button>

          {/* Dashboard (for admin or vendor) */}
          {isAuthenticated && (user?.role === 'admin' || user?.role === 'vendor') && (
            <button
              onClick={() => onNavigate('dashboard')}
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                color: currentPage === 'dashboard' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                background: currentPage === 'dashboard' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              }}
            >
              Dashboard
            </button>
          )}

          {/* AI Shopping Assistant Trigger */}
          <button
            onClick={onOpenAI}
            className="pulse-glow"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--accent-gradient)',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            <Sparkles size={16} />
            <span>AI Agent</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Shopping Cart Drawer Trigger */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            style={{
              position: 'relative',
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
            }}
            title="Open cart"
          >
            <ShoppingBag size={18} />
            {totalCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'var(--accent-primary)',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  width: '18px',
                  height: '18px',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {totalCount}
              </span>
            )}
          </button>

          {/* User Account / Profile */}
          <div style={{ position: 'relative' }}>
            {isAuthenticated ? (
              <div>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--accent-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name || user.email.split('@')[0]}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      width: '200px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg)',
                      padding: '8px',
                      zIndex: 1000,
                      animation: 'fadeIn 0.15s ease',
                    }}
                  >
                    <div style={{ padding: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name || 'Customer'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                      <span className="badge badge-info" style={{ marginTop: '6px', fontSize: '0.65rem' }}>
                        {user.role || 'customer'}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        onNavigate('orders');
                        setIsUserMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'left',
                      }}
                    >
                      <Package size={16} /> My Orders
                    </button>

                    <button
                      onClick={() => {
                        onNavigate('returns');
                        setIsUserMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'left',
                      }}
                    >
                      <RotateCcw size={16} /> Returns & RMA
                    </button>

                    {(user.role === 'admin' || user.role === 'vendor') && (
                      <button
                        onClick={() => {
                          onNavigate('dashboard');
                          setIsUserMenuOpen(false);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                          borderRadius: 'var(--radius-sm)',
                          textAlign: 'left',
                        }}
                      >
                        <LayoutDashboard size={16} /> Dashboard
                      </button>
                    )}

                    <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '4px', paddingTop: '4px' }}>
                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          fontSize: '0.85rem',
                          color: 'var(--danger)',
                          borderRadius: 'var(--radius-sm)',
                          textAlign: 'left',
                        }}
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('signin')}
                className="btn btn-secondary btn-sm"
              >
                <UserIcon size={16} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
