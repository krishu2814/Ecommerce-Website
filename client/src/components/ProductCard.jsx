import React, { useState } from 'react';
import { Plus, Check, ShoppingBag, Eye } from 'lucide-react';
import StarRating from './StarRating';
import { useCart } from '../context/CartContext';

const ProductCard = ({ product, onSelect }) => {
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  const stock = product.stock !== undefined ? product.stock : 25;
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 5;

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product, 1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const image =
    product.image ||
    product.imageUrl ||
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';

  return (
    <div
      onClick={() => onSelect(product)}
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.borderColor = 'var(--border-medium)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
      }}
    >
      {/* Product Image Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '80%', // 4:3 Aspect ratio
          overflow: 'hidden',
          backgroundColor: 'var(--bg-tertiary)',
        }}
      >
        <img
          src={image}
          alt={product.name || product.title}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          loading="lazy"
        />

        {/* Stock Badge Overlay */}
        <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
          {isOutOfStock ? (
            <span className="badge badge-danger">Out of Stock</span>
          ) : isLowStock ? (
            <span className="badge badge-warning">Only {stock} Left</span>
          ) : (
            <span className="badge badge-success">In Stock</span>
          )}
        </div>

        {/* Category Badge */}
        {product.category && (
          <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                color: '#ffffff',
                textTransform: 'capitalize',
              }}
            >
              {product.category}
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Title */}
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            marginBottom: '6px',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.3,
            minHeight: '2.6em',
          }}
        >
          {product.name || product.title}
        </h3>

        {/* Star Rating & Review Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
          <StarRating rating={product.rating || product.averageRating || 4.5} size={14} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            ({product.reviewsCount || product.numReviews || 12})
          </span>
        </div>

        {/* Price & Action Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              ${Number(product.price).toFixed(2)}
            </div>
            {product.originalPrice && product.originalPrice > product.price && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                ${Number(product.originalPrice).toFixed(2)}
              </span>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`btn ${isAdded ? 'btn-secondary' : 'btn-primary'} btn-sm`}
            style={{
              borderRadius: 'var(--radius-full)',
              padding: '8px 14px',
              opacity: isOutOfStock ? 0.5 : 1,
              cursor: isOutOfStock ? 'not-allowed' : 'pointer',
            }}
            title={isOutOfStock ? 'Item out of stock' : 'Add to cart'}
          >
            {isAdded ? (
              <>
                <Check size={16} color="var(--success)" /> Added
              </>
            ) : (
              <>
                <Plus size={16} /> Add
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
