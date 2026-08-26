import React from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ rating = 0, max = 5, interactive = false, onRatingChange, size = 16 }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      {Array.from({ length: max }, (_, index) => {
        const starNumber = index + 1;
        const isFilled = starNumber <= Math.round(rating);

        return (
          <span
            key={index}
            onClick={() => interactive && onRatingChange && onRatingChange(starNumber)}
            style={{
              cursor: interactive ? 'pointer' : 'default',
              transition: 'transform 0.15s ease',
              display: 'inline-flex',
            }}
            onMouseEnter={(e) => {
              if (interactive) e.currentTarget.style.transform = 'scale(1.2)';
            }}
            onMouseLeave={(e) => {
              if (interactive) e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Star
              size={size}
              style={{
                color: isFilled ? '#fbbf24' : 'var(--border-medium)',
                fill: isFilled ? '#fbbf24' : 'transparent',
              }}
            />
          </span>
        );
      })}
    </div>
  );
};

export default StarRating;
