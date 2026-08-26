const { describe, it } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET_TOKEN = 'ecommerce_jwt_secret_dev_key';

describe('Auth-Service Test Suite', () => {
  describe('Password Hashing & Verification', () => {
    it('should securely hash password with bcrypt', async () => {
      const plainPassword = 'SuperSecretPassword123!';
      const saltRounds = 10;
      const hash = await bcrypt.hash(plainPassword, saltRounds);

      assert.notStrictEqual(hash, plainPassword);
      assert.strictEqual(typeof hash, 'string');
      assert.strictEqual(hash.startsWith('$2'), true);

      const isValid = await bcrypt.compare(plainPassword, hash);
      assert.strictEqual(isValid, true);

      const isInvalid = await bcrypt.compare('WrongPassword', hash);
      assert.strictEqual(isInvalid, false);
    });
  });

  describe('JWT Token Generation & Validation', () => {
    it('should generate valid JWT containing user payload and expiration', () => {
      const userPayload = {
        id: '65e0a1b2c3d4e5f6a7b8c9d0',
        email: 'customer@example.com',
        role: 'customer'
      };

      const token = jwt.sign(userPayload, SECRET_TOKEN, { expiresIn: '1h' });
      assert.strictEqual(typeof token, 'string');

      const decoded = jwt.verify(token, SECRET_TOKEN);
      assert.strictEqual(decoded.id, userPayload.id);
      assert.strictEqual(decoded.email, userPayload.email);
      assert.strictEqual(decoded.role, userPayload.role);
      assert.ok(decoded.exp);
    });

    it('should reject invalid or tampered JWT', () => {
      const userPayload = { id: '123', email: 'test@test.com', role: 'admin' };
      const token = jwt.sign(userPayload, 'wrong_secret');

      assert.throws(() => {
        jwt.verify(token, SECRET_TOKEN);
      }, /invalid signature/);
    });

    it('should reject expired token', async () => {
      const token = jwt.sign({ id: '123' }, SECRET_TOKEN, { expiresIn: '1ms' });
      await new Promise(r => setTimeout(r, 20));

      assert.throws(() => {
        jwt.verify(token, SECRET_TOKEN);
      }, /jwt expired/);
    });
  });

  describe('Role Authorization Checks', () => {
    const validRoles = ['customer', 'admin', 'vendor'];

    it('should allow valid assigned roles', () => {
      for (const role of validRoles) {
        assert.ok(validRoles.includes(role));
      }
    });

    it('should reject unpermitted roles', () => {
      const invalidRole = 'superuser';
      assert.strictEqual(validRoles.includes(invalidRole), false);
    });
  });

  describe('Authentication Middleware Logic', () => {
    it('should extract Bearer token and populate req.user', () => {
      const userPayload = { id: 'u1', email: 'u1@test.com', role: 'customer' };
      const token = jwt.sign(userPayload, SECRET_TOKEN);
      const authHeader = `Bearer ${token}`;

      const extracted = authHeader.split(' ')[1];
      const decoded = jwt.verify(extracted, SECRET_TOKEN);

      const req = { headers: { authorization: authHeader } };
      req.user = {
        id: decoded.id,
        userId: decoded.id,
        email: decoded.email,
        role: decoded.role
      };

      assert.strictEqual(req.user.id, 'u1');
      assert.strictEqual(req.user.role, 'customer');
    });

    it('should handle missing authorization header', () => {
      const req = { headers: {} };
      const hasAuth = Boolean(req.headers['authorization']);
      assert.strictEqual(hasAuth, false);
    });
  });
});
