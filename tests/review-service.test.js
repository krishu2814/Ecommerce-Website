const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Review-Service Test Suite', () => {
  describe('Review Validation Rules', () => {
    it('should validate star rating is an integer between 1 and 5', () => {
      const validateRating = (r) => {
        const num = Number(r);
        return Number.isInteger(num) && num >= 1 && num <= 5;
      };

      assert.strictEqual(validateRating(1), true);
      assert.strictEqual(validateRating(5), true);
      assert.strictEqual(validateRating(3), true);
      assert.strictEqual(validateRating(0), false);
      assert.strictEqual(validateRating(6), false);
      assert.strictEqual(validateRating(3.5), false);
      assert.strictEqual(validateRating('abc'), false);
    });

    it('should reject empty comment', () => {
      const validateComment = (c) => Boolean(c && c.trim().length > 0);

      assert.strictEqual(validateComment('Great product!'), true);
      assert.strictEqual(validateComment('   '), false);
      assert.strictEqual(validateComment(''), false);
      assert.strictEqual(validateComment(null), false);
    });
  });

  describe('Verified Purchase Verification Logic', () => {
    it('should identify verified purchase when product is found in completed user orders', () => {
      const userOrders = [
        {
          orderStatus: 'CONFIRMED',
          paymentStatus: 'SUCCESS',
          items: [{ productId: 'p123', quantity: 1 }]
        },
        {
          orderStatus: 'CANCELLED',
          items: [{ productId: 'p456', quantity: 2 }]
        }
      ];

      const checkVerified = (productId) => {
        return userOrders.some(order => {
          const isCompleted = order.paymentStatus === 'SUCCESS' || order.orderStatus === 'CONFIRMED';
          if (!isCompleted) return false;
          return order.items.some(item => item.productId === productId);
        });
      };

      assert.strictEqual(checkVerified('p123'), true);
      assert.strictEqual(checkVerified('p456'), false);
      assert.strictEqual(checkVerified('p999'), false);
    });
  });

  describe('Review Rating Aggregation Engine', () => {
    it('should accurately compute average rating and distribution breakdown', () => {
      const reviews = [
        { rating: 5 },
        { rating: 5 },
        { rating: 4 },
        { rating: 4 },
        { rating: 2 }
      ];

      const totalReviews = reviews.length;
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      const averageRating = Math.round((sum / totalReviews) * 10) / 10;

      const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      for (const r of reviews) {
        breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
      }

      assert.strictEqual(totalReviews, 5);
      assert.strictEqual(averageRating, 4.0);
      assert.strictEqual(breakdown[5], 2);
      assert.strictEqual(breakdown[4], 2);
      assert.strictEqual(breakdown[2], 1);
      assert.strictEqual(breakdown[1], 0);
    });
  });

  describe('Helpful Voting Engine', () => {
    it('should record unique helpful / unhelpful votes per user', () => {
      const review = {
        helpfulVotes: 0,
        unhelpfulVotes: 0,
        voters: [] // [{ userId, voteType }]
      };

      const vote = (userId, voteType) => {
        const existing = review.voters.find(v => v.userId === userId);
        if (existing) {
          if (existing.voteType === voteType) return; // same vote, ignore
          // Toggle vote
          if (existing.voteType === 'HELPFUL') review.helpfulVotes--;
          if (existing.voteType === 'UNHELPFUL') review.unhelpfulVotes--;
          existing.voteType = voteType;
        } else {
          review.voters.push({ userId, voteType });
        }

        if (voteType === 'HELPFUL') review.helpfulVotes++;
        if (voteType === 'UNHELPFUL') review.unhelpfulVotes++;
      };

      vote('user1', 'HELPFUL');
      assert.strictEqual(review.helpfulVotes, 1);
      assert.strictEqual(review.unhelpfulVotes, 0);

      vote('user2', 'UNHELPFUL');
      assert.strictEqual(review.helpfulVotes, 1);
      assert.strictEqual(review.unhelpfulVotes, 1);

      // User 2 switches to HELPFUL
      vote('user2', 'HELPFUL');
      assert.strictEqual(review.helpfulVotes, 2);
      assert.strictEqual(review.unhelpfulVotes, 0);
    });
  });
});
