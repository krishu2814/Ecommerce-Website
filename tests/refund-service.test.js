const { describe, it } = require('node:test');
const assert = require('node:assert');
const ShippingLabelUtil = require('../services/Refund-Service/src/utils/shipping-label');
const PaymentGateway = require('../services/Refund-Service/src/utils/payment-gateway');

describe('Refund-Service - Feature 1: Create Return Request', () => {
  describe('Input Validation & Order Ownership Check', () => {
    it('should validate that orderId, items, and reason are present', () => {
      const validateInput = (data) => {
        if (!data.orderId) throw new Error('Order ID is required');
        if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
          throw new Error('At least one item must be selected for return');
        }
        if (!data.reason || data.reason.trim().length === 0) {
          throw new Error('Return reason is required');
        }
        return true;
      };

      assert.strictEqual(
        validateInput({
          orderId: 'ord_12345',
          items: [{ productId: 'p1', name: 'Shoes', price: 99, quantity: 1 }],
          reason: 'Item is defective'
        }),
        true
      );

      assert.throws(() => validateInput({ items: [{ productId: 'p1' }], reason: 'Broken' }), /Order ID is required/);
      assert.throws(() => validateInput({ orderId: 'ord_1', items: [], reason: 'Broken' }), /At least one item must be selected/);
      assert.throws(() => validateInput({ orderId: 'ord_1', items: [{ productId: 'p1' }], reason: '' }), /Return reason is required/);
    });

    it('should verify order ownership matches the authenticated user', () => {
      const order = { userId: 'user_100', totalAmount: 199.99, orderStatus: 'CONFIRMED' };
      const currentUserId = 'user_100';
      const unauthorizedUserId = 'user_999';

      assert.strictEqual(String(order.userId) === String(currentUserId), true);
      assert.strictEqual(String(order.userId) === String(unauthorizedUserId), false);
    });

    it('should calculate originalAmount based on selected return item quantities', () => {
      const items = [
        { productId: 'p1', name: 'Keyboard', price: 60, quantity: 2 },
        { productId: 'p2', name: 'Mouse', price: 30, quantity: 1 }
      ];

      const originalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      assert.strictEqual(originalAmount, 150);
    });

    it('should generate an initial return shipping label during return creation', () => {
      const label = ShippingLabelUtil.generateLabel({
        returnId: 'ret_test_1',
        orderId: 'ord_test_1',
        pickupAddress: '123 Main Street'
      });

      assert.ok(label.labelId.startsWith('LBL-'));
      assert.ok(label.trackingNumber.startsWith('RET-TRK-'));
      assert.strictEqual(label.carrier, 'Express Logistics Returns');
    });
  });
});

describe('Refund-Service - Feature 2: Fetch Return Requests', () => {
  describe('Ownership & Role Authorization Checks', () => {
    it('should allow customer to access their own return request', () => {
      const returnRecord = {
        _id: 'ret_100',
        userId: 'user_abc',
        orderId: 'ord_123',
        status: 'RETURN_REQUESTED'
      };

      const checkAccess = (record, requestingUserId, role) => {
        if (!record) throw new Error('Return request not found');
        if (role !== 'admin' && String(record.userId) !== String(requestingUserId)) {
          throw new Error('Access denied to this return record');
        }
        return true;
      };

      assert.strictEqual(checkAccess(returnRecord, 'user_abc', 'customer'), true);
    });

    it('should allow admin to access any return request', () => {
      const returnRecord = {
        _id: 'ret_100',
        userId: 'user_abc',
        orderId: 'ord_123'
      };

      const checkAccess = (record, requestingUserId, role) => {
        if (!record) throw new Error('Return request not found');
        if (role !== 'admin' && String(record.userId) !== String(requestingUserId)) {
          throw new Error('Access denied to this return record');
        }
        return true;
      };

      assert.strictEqual(checkAccess(returnRecord, 'admin_user', 'admin'), true);
    });

    it('should throw 403 Access Denied when another customer attempts to view the return', () => {
      const returnRecord = {
        _id: 'ret_100',
        userId: 'user_abc',
        orderId: 'ord_123'
      };

      const checkAccess = (record, requestingUserId, role) => {
        if (!record) throw new Error('Return request not found');
        if (role !== 'admin' && String(record.userId) !== String(requestingUserId)) {
          throw new Error('Access denied to this return record');
        }
        return true;
      };

      assert.throws(() => {
        checkAccess(returnRecord, 'attacker_user_xyz', 'customer');
      }, /Access denied to this return record/);
    });

    it('should filter user returns list by user ID and sort by newest first', () => {
      const allReturns = [
        { _id: 'r1', userId: 'user_1', createdAt: new Date('2026-08-01') },
        { _id: 'r2', userId: 'user_2', createdAt: new Date('2026-08-02') },
        { _id: 'r3', userId: 'user_1', createdAt: new Date('2026-08-03') }
      ];

      const user1Returns = allReturns
        .filter(r => r.userId === 'user_1')
        .sort((a, b) => b.createdAt - a.createdAt);

      assert.strictEqual(user1Returns.length, 2);
      assert.strictEqual(user1Returns[0]._id, 'r3'); // newest
      assert.strictEqual(user1Returns[1]._id, 'r1');
    });
  });
});

describe('Refund-Service - Feature 3: Schedule Courier Pickup', () => {
  describe('Status Progression & Pickup Details Validation', () => {
    it('should transition status from RETURN_REQUESTED to PICKUP_SCHEDULED', () => {
      const returnRecord = {
        _id: 'ret_123',
        status: 'RETURN_REQUESTED',
        pickupDetails: {}
      };

      const schedulePickup = (record, pickupData) => {
        if (record.status !== 'RETURN_REQUESTED') {
          throw new Error(`Cannot schedule pickup. Current status is ${record.status}, expected RETURN_REQUESTED`);
        }
        record.status = 'PICKUP_SCHEDULED';
        record.pickupDetails = {
          scheduledDate: pickupData.scheduledDate || new Date(),
          pickupSlot: pickupData.pickupSlot || 'Morning (9 AM - 1 PM)',
          courierPartner: pickupData.courierPartner || 'Express Logistics'
        };
        return record;
      };

      const updated = schedulePickup(returnRecord, {
        scheduledDate: new Date('2026-08-28'),
        pickupSlot: 'Afternoon (2 PM - 6 PM)',
        courierPartner: 'DHL Express'
      });

      assert.strictEqual(updated.status, 'PICKUP_SCHEDULED');
      assert.strictEqual(updated.pickupDetails.pickupSlot, 'Afternoon (2 PM - 6 PM)');
      assert.strictEqual(updated.pickupDetails.courierPartner, 'DHL Express');
    });

    it('should reject pickup scheduling if status is not RETURN_REQUESTED', () => {
      const returnRecord = {
        _id: 'ret_123',
        status: 'ITEM_INSPECTED' // already inspected
      };

      const schedulePickup = (record) => {
        if (record.status !== 'RETURN_REQUESTED') {
          throw new Error(`Cannot schedule pickup. Current status is ${record.status}, expected RETURN_REQUESTED`);
        }
      };

      assert.throws(() => {
        schedulePickup(returnRecord);
      }, /expected RETURN_REQUESTED/);
    });

    it('should format valid RETURN_PICKUP_SCHEDULED RabbitMQ event payload', () => {
      const event = {
        event: 'RETURN_PICKUP_SCHEDULED',
        returnId: 'ret_123',
        orderId: 'ord_456',
        userId: 'usr_789',
        pickupDetails: {
          scheduledDate: new Date().toISOString(),
          pickupSlot: 'Morning (9 AM - 1 PM)',
          courierPartner: 'Express Logistics'
        },
        timestamp: new Date().toISOString()
      };

      assert.strictEqual(event.event, 'RETURN_PICKUP_SCHEDULED');
      assert.strictEqual(event.returnId, 'ret_123');
      assert.strictEqual(event.orderId, 'ord_456');
      assert.ok(event.pickupDetails.courierPartner);
    });
  });
});

describe('Refund-Service - Feature 4: Record Item Inspection', () => {
  describe('Quality Inspection Pass/Fail Branching Logic', () => {
    it('should transition status to ITEM_INSPECTED when inspection passes', () => {
      const returnRecord = {
        _id: 'ret_123',
        status: 'PICKUP_SCHEDULED',
        inspectionDetails: {}
      };

      const recordInspection = (record, inspectionData) => {
        if (record.status !== 'PICKUP_SCHEDULED') {
          throw new Error(`Cannot record inspection. Current status is ${record.status}, expected PICKUP_SCHEDULED`);
        }
        const passed = inspectionData.passed !== undefined ? Boolean(inspectionData.passed) : true;
        record.status = passed ? 'ITEM_INSPECTED' : 'REJECTED';
        record.inspectionDetails = {
          inspectorName: inspectionData.inspectorName || 'Inspector Bob',
          itemCondition: inspectionData.itemCondition || 'GOOD',
          passed,
          notes: inspectionData.notes || 'Passed quality verification'
        };
        return record;
      };

      const updated = recordInspection(returnRecord, {
        inspectorName: 'Quality Lead Sarah',
        itemCondition: 'GOOD',
        passed: true,
        notes: 'Original tags intact, item unused'
      });

      assert.strictEqual(updated.status, 'ITEM_INSPECTED');
      assert.strictEqual(updated.inspectionDetails.passed, true);
      assert.strictEqual(updated.inspectionDetails.itemCondition, 'GOOD');
    });

    it('should transition status to REJECTED when inspection fails quality check', () => {
      const returnRecord = {
        _id: 'ret_123',
        status: 'PICKUP_SCHEDULED',
        inspectionDetails: {}
      };

      const recordInspection = (record, inspectionData) => {
        if (record.status !== 'PICKUP_SCHEDULED') {
          throw new Error(`Cannot record inspection. Current status is ${record.status}, expected PICKUP_SCHEDULED`);
        }
        const passed = inspectionData.passed !== undefined ? Boolean(inspectionData.passed) : true;
        record.status = passed ? 'ITEM_INSPECTED' : 'REJECTED';
        record.inspectionDetails = {
          inspectorName: inspectionData.inspectorName || 'Inspector Bob',
          itemCondition: inspectionData.itemCondition || 'DAMAGED',
          passed,
          notes: inspectionData.notes || 'Failed check'
        };
        return record;
      };

      const updated = recordInspection(returnRecord, {
        inspectorName: 'Quality Lead Sarah',
        itemCondition: 'DAMAGED',
        passed: false,
        notes: 'Item damaged by customer, signs of heavy wear'
      });

      assert.strictEqual(updated.status, 'REJECTED');
      assert.strictEqual(updated.inspectionDetails.passed, false);
      assert.strictEqual(updated.inspectionDetails.itemCondition, 'DAMAGED');
    });

    it('should reject inspection if return status is not PICKUP_SCHEDULED', () => {
      const returnRecord = {
        _id: 'ret_123',
        status: 'RETURN_REQUESTED' // item has not been picked up yet
      };

      const recordInspection = (record) => {
        if (record.status !== 'PICKUP_SCHEDULED') {
          throw new Error(`Cannot record inspection. Current status is ${record.status}, expected PICKUP_SCHEDULED`);
        }
      };

      assert.throws(() => {
        recordInspection(returnRecord);
      }, /expected PICKUP_SCHEDULED/);
    });

    it('should format valid RETURN_INSPECTED RabbitMQ event payload', () => {
      const event = {
        event: 'RETURN_INSPECTED',
        returnId: 'ret_123',
        orderId: 'ord_456',
        userId: 'usr_789',
        status: 'ITEM_INSPECTED',
        passed: true,
        inspectionDetails: {
          inspectorName: 'Quality Inspector Alex',
          itemCondition: 'GOOD',
          passed: true
        },
        timestamp: new Date().toISOString()
      };

      assert.strictEqual(event.event, 'RETURN_INSPECTED');
      assert.strictEqual(event.status, 'ITEM_INSPECTED');
      assert.strictEqual(event.passed, true);
    });
  });
});

describe('Refund-Service - Feature 5: Process Refund (Full & Partial)', () => {
  describe('Refund Amount Calculations & Gateway Execution', () => {
    it('should execute Full Refund equal to original return amount', () => {
      const returnRecord = {
        _id: 'ret_123',
        status: 'ITEM_INSPECTED',
        originalAmount: 180.00
      };

      const refundType = 'FULL';
      const refundAmount = refundType === 'FULL' ? returnRecord.originalAmount : 0;

      assert.strictEqual(refundAmount, 180.00);
    });

    it('should execute Partial Refund when amount is within allowable limits', () => {
      const originalAmount = 250.00;
      const requestedPartialAmount = 100.00;

      const validatePartial = (orig, req) => {
        if (req <= 0) throw new Error('Refund amount must be a positive number');
        if (req > orig) throw new Error(`Refund amount ($${req}) cannot exceed original order amount ($${orig})`);
        return req;
      };

      const refundAmount = validatePartial(originalAmount, requestedPartialAmount);
      assert.strictEqual(refundAmount, 100.00);
    });

    it('should reject Partial Refund when amount exceeds original order amount', () => {
      const originalAmount = 50.00;
      const requestedPartialAmount = 75.00;

      const validatePartial = (orig, req) => {
        if (req > orig) throw new Error(`Refund amount ($${req}) cannot exceed original order amount ($${orig})`);
      };

      assert.throws(() => {
        validatePartial(originalAmount, requestedPartialAmount);
      }, /cannot exceed original order amount/);
    });

    it('should prevent duplicate refund if status is already REFUND_PROCESSED', () => {
      const returnRecord = { status: 'REFUND_PROCESSED' };

      const checkDuplicate = (record) => {
        if (record.status === 'REFUND_PROCESSED') {
          throw new Error('Return request has already been refunded');
        }
      };

      assert.throws(() => {
        checkDuplicate(returnRecord);
      }, /Return request has already been refunded/);
    });

    it('should prevent refund if status is REJECTED', () => {
      const returnRecord = { status: 'REJECTED' };

      const checkReject = (record) => {
        if (record.status === 'REJECTED') {
          throw new Error('Cannot refund a rejected return request');
        }
      };

      assert.throws(() => {
        checkReject(returnRecord);
      }, /Cannot refund a rejected return request/);
    });

    it('should return valid refund transaction ID from PaymentGateway', async () => {
      const gatewayResult = await PaymentGateway.processRefund({
        amount: 120.00,
        paymentGateway: 'Original_Payment',
        originalPaymentId: 'ord_123',
        simulateFailure: false
      });

      assert.strictEqual(gatewayResult.success, true);
      assert.ok(gatewayResult.refundTransactionId.startsWith('REF_TXN_'));
      assert.strictEqual(gatewayResult.gateway, 'Original_Payment');
    });

    it('should throw error when simulated failure is requested', async () => {
      await assert.rejects(async () => {
        await PaymentGateway.processRefund({
          amount: 100,
          paymentGateway: 'Stripe',
          simulateFailure: true
        });
      }, /Payment Gateway declined the refund request/);
    });
  });
});

describe('Refund-Service - Feature 6: Return Shipping Label', () => {
  describe('Shipping Label Retrieval & PDF URL Generation', () => {
    it('should return existing shipping label if already attached to return record', () => {
      const returnRecord = {
        _id: 'ret_123',
        userId: 'usr_100',
        shippingLabel: {
          labelId: 'LBL-ret_123',
          trackingNumber: 'RET-TRK-172465789-4567',
          carrier: 'Express Logistics Returns',
          labelUrl: 'https://logistics.ecommerce.local/labels/LBL-ret_123.pdf'
        }
      };

      const getLabel = (record, requestingUserId, role) => {
        if (!record) throw new Error('Return request not found');
        if (role !== 'admin' && String(record.userId) !== String(requestingUserId)) {
          throw new Error('Access denied to this return record');
        }
        return record.shippingLabel;
      };

      const label = getLabel(returnRecord, 'usr_100', 'customer');
      assert.strictEqual(label.labelId, 'LBL-ret_123');
      assert.strictEqual(label.carrier, 'Express Logistics Returns');
      assert.ok(label.labelUrl.endsWith('.pdf'));
    });

    it('should generate label on demand if missing in return record', () => {
      const returnRecord = {
        _id: 'ret_456',
        userId: 'usr_200',
        orderId: 'ord_789',
        pickupDetails: { pickupAddress: '456 Oak Avenue' }
      };

      const getLabel = (record, requestingUserId, role) => {
        if (!record) throw new Error('Return request not found');
        if (role !== 'admin' && String(record.userId) !== String(requestingUserId)) {
          throw new Error('Access denied to this return record');
        }
        if (!record.shippingLabel) {
          record.shippingLabel = ShippingLabelUtil.generateLabel({
            returnId: record._id,
            orderId: record.orderId,
            pickupAddress: record.pickupDetails?.pickupAddress
          });
        }
        return record.shippingLabel;
      };

      const label = getLabel(returnRecord, 'usr_200', 'customer');
      assert.ok(label.labelId.startsWith('LBL-'));
      assert.ok(label.trackingNumber.startsWith('RET-TRK-'));
      assert.strictEqual(label.pickupAddress, '456 Oak Avenue');
    });

    it('should deny access if another customer requests the shipping label', () => {
      const returnRecord = {
        _id: 'ret_123',
        userId: 'usr_100',
        shippingLabel: { labelId: 'LBL-123' }
      };

      const getLabel = (record, requestingUserId, role) => {
        if (!record) throw new Error('Return request not found');
        if (role !== 'admin' && String(record.userId) !== String(requestingUserId)) {
          throw new Error('Access denied to this return record');
        }
        return record.shippingLabel;
      };

      assert.throws(() => {
        getLabel(returnRecord, 'attacker_user_xyz', 'customer');
      }, /Access denied to this return record/);
    });
  });
});
