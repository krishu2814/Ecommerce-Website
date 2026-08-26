import React, { useState, useEffect } from 'react';
import { Sparkles, SlidersHorizontal, ArrowUpDown, Check, RefreshCw } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import api from '../services/api';

// Curated demo products with real Unsplash images matching the backend schema
const DEFAULT_PRODUCTS = [
  {
    _id: 'prod_1',
    name: 'Sony WH-1000XM5 Wireless Noise-Cancelling Headphones',
    description: 'Industry-leading noise cancellation, crystal clear hands-free calling, up to 30-hour battery life.',
    price: 349.99,
    originalPrice: 399.99,
    category: 'Electronics',
    stock: 18,
    rating: 4.9,
    reviewsCount: 48,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
  },
  {
    _id: 'prod_2',
    name: 'Apple Watch Ultra 2 GPS + Cellular Titanium Case',
    description: 'Rugged and capable smartwatch with precision dual-frequency GPS, customizable action button, and 36h battery.',
    price: 799.00,
    originalPrice: 849.00,
    category: 'Electronics',
    stock: 8,
    rating: 4.8,
    reviewsCount: 34,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
  },
  {
    _id: 'prod_3',
    name: 'Nike Air Zoom Pegasus 40 Running Shoes',
    description: 'A springy ride for every run, familiar feel that returns to help you accomplish your personal goals.',
    price: 130.00,
    originalPrice: 160.00,
    category: 'Footwear',
    stock: 24,
    rating: 4.7,
    reviewsCount: 89,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
  },
  {
    _id: 'prod_4',
    name: 'Logitech MX Master 3S Ergonomic Wireless Mouse',
    description: 'Quiet clicks and 8K DPI any-surface tracking, MagSpeed electromagnetic scrolling with ultra-precision.',
    price: 99.99,
    originalPrice: 119.99,
    category: 'Accessories',
    stock: 35,
    rating: 4.9,
    reviewsCount: 112,
    image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80',
  },
  {
    _id: 'prod_5',
    name: 'Keychron Q1 Pro Custom Mechanical Keyboard (QMK/VIA)',
    description: 'Full aluminum body, wireless mechanical keyboard with double-gasket design and hot-swappable switches.',
    price: 199.00,
    originalPrice: 220.00,
    category: 'Accessories',
    stock: 4, // Low stock demo
    rating: 4.9,
    reviewsCount: 65,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80',
  },
  {
    _id: 'prod_6',
    name: 'Minimalist Matte Ceramic Smart Mug & Warmer',
    description: 'Maintains your beverage at the exact preferred drinking temperature with smartphone app control.',
    price: 129.99,
    originalPrice: 149.99,
    category: 'Home',
    stock: 12,
    rating: 4.6,
    reviewsCount: 29,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
  },
  {
    _id: 'prod_7',
    name: 'Peak Design Everyday Backpack 20L (Charcoal)',
    description: 'Iconic, award-winning pack for everyday and photo carry, weatherproof 100% recycled nylon canvas shell.',
    price: 279.95,
    originalPrice: 299.95,
    category: 'Fashion',
    stock: 0, // Out of stock demo
    rating: 4.8,
    reviewsCount: 42,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
  },
  {
    _id: 'prod_8',
    name: 'Sony PlayStation 5 DualSense Wireless Controller',
    description: 'Immersive haptic feedback, dynamic adaptive triggers, and built-in microphone integrated in iconic design.',
    price: 69.99,
    originalPrice: 79.99,
    category: 'Electronics',
    stock: 40,
    rating: 4.9,
    reviewsCount: 230,
    image: 'https://images.unsplash.com/photo-1606318801954-d46846fe56a8?auto=format&fit=crop&w=600&q=80',
  },
];

const CATEGORIES = ['All', 'Electronics', 'Footwear', 'Accessories', 'Fashion', 'Home'];

const CatalogPage = ({ onSelectProduct, searchQuery, onOpenAI }) => {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [maxPrice, setMaxPrice] = useState(1000);
  const [minRating, setMinRating] = useState(0);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [loading, setLoading] = useState(false);

  // Attempt backend products lookup
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await api.get('/products');
        if (res.data && res.data.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setProducts(res.data.data);
        }
      } catch (err) {
        console.log('Using preloaded premium catalog dataset:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter & Sort Logic
  const filteredProducts = products.filter((p) => {
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = (p.name || p.title || '').toLowerCase().includes(q);
      const matchDesc = (p.description || '').toLowerCase().includes(q);
      const matchCat = (p.category || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchCat) return false;
    }

    // Category
    if (selectedCategory !== 'All' && (p.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }

    // Price
    if (p.price > maxPrice) return false;

    // Rating
    const r = p.rating || p.averageRating || 0;
    if (r < minRating) return false;

    // Stock
    if (onlyInStock && (p.stock !== undefined ? p.stock : 10) <= 0) return false;

    return true;
  });

  // Sort
  filteredProducts.sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  const resetFilters = () => {
    setSelectedCategory('All');
    setMaxPrice(1000);
    setMinRating(0);
    setOnlyInStock(false);
    setSortBy('recommended');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Hero Banner */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          padding: '48px 36px',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(217, 70, 239, 0.1) 100%)',
          border: '1px solid var(--border-medium)',
        }}
      >
        <div style={{ maxWidth: '650px', position: 'relative', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--accent-secondary)',
              marginBottom: '16px',
            }}
          >
            <Sparkles size={14} /> NexStore 2026 Spring Release
          </div>

          <h1 style={{ fontSize: '2.5rem', lineHeight: 1.15, marginBottom: '14px', letterSpacing: '-0.03em' }}>
            Next-Gen Microservices <br />
            <span className="gradient-text">Shopping Experience</span>
          </h1>

          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            Powered by asynchronous event-driven choreography, real-time inventory locking, and an autonomous AI ReAct Shopping Assistant. Use code <strong style={{ color: 'var(--accent-primary)' }}>SAVE20</strong> at checkout for 20% off!
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                const el = document.getElementById('catalog-grid');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn btn-primary btn-lg"
            >
              Explore Products
            </button>
            <button onClick={onOpenAI} className="btn btn-secondary btn-lg">
              <Sparkles size={18} color="var(--accent-secondary)" /> Ask AI Assistant
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.88rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              background: selectedCategory === cat ? 'var(--accent-gradient)' : 'var(--bg-secondary)',
              color: selectedCategory === cat ? '#ffffff' : 'var(--text-secondary)',
              border: `1px solid ${selectedCategory === cat ? 'transparent' : 'var(--border-subtle)'}`,
              boxShadow: selectedCategory === cat ? 'var(--shadow-glow)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Layout: Filters Sidebar + Products Grid */}
      <div id="catalog-grid" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '28px' }}>
        {/* Filter Sidebar */}
        <aside
          className="glass-panel"
          style={{
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            height: 'fit-content',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SlidersHorizontal size={18} /> Filters
            </h3>
            <button
              onClick={resetFilters}
              style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}
            >
              Reset All
            </button>
          </div>

          {/* Price Range */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              Max Price: <strong style={{ color: 'var(--text-primary)' }}>${maxPrice}</strong>
            </label>
            <input
              type="range"
              min="20"
              max="1000"
              step="10"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>$20</span>
              <span>$1000</span>
            </div>
          </div>

          {/* Minimum Rating */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              Minimum Rating
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { label: 'All Ratings', value: 0 },
                { label: '4.5★ & Above', value: 4.5 },
                { label: '4.0★ & Above', value: 4.0 },
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setMinRating(r.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    background: minRating === r.value ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    color: minRating === r.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    border: `1px solid ${minRating === r.value ? 'rgba(99, 102, 241, 0.3)' : 'transparent'}`,
                    textAlign: 'left',
                  }}
                >
                  <span>{r.label}</span>
                  {minRating === r.value && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>

          {/* In Stock Only Toggle */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
              />
              <span>In-Stock Only</span>
            </label>
          </div>
        </aside>

        {/* Products Grid Section */}
        <section>
          {/* Header & Sort Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredProducts.length}</strong> items
                {searchQuery && ` for "${searchQuery}"`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowUpDown size={16} color="var(--text-muted)" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-field"
                style={{ height: '36px', padding: '4px 12px', fontSize: '0.85rem', width: 'auto' }}
              >
                <option value="recommended">Featured / Recommended</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Product Cards Grid */}
          {filteredProducts.length === 0 ? (
            <div
              className="glass-panel"
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--text-muted)',
              }}
            >
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '8px' }}>No products found</h3>
              <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>Try adjusting your filters or search terms to find what you are looking for.</p>
              <button onClick={resetFilters} className="btn btn-secondary btn-sm">
                <RefreshCw size={14} /> Clear All Filters
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '20px',
              }}
            >
              {filteredProducts.map((product) => (
                <ProductCard key={product._id || product.id} product={product} onSelect={onSelectProduct} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CatalogPage;
