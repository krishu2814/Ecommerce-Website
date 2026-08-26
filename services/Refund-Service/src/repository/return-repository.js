const Return = require("../model/return-model");

class ReturnRepository {
  async createReturn(returnData) {
    return await Return.create(returnData);
  }

  async getReturnById(returnId) {
    return await Return.findById(returnId);
  }

  async getReturnsByUserId(userId) {
    return await Return.find({ userId }).sort({ createdAt: -1 });
  }

  async getReturnsByOrderId(orderId) {
    return await Return.find({ orderId }).sort({ createdAt: -1 });
  }

  async getAllReturns(filter = {}) {
    return await Return.find(filter).sort({ createdAt: -1 });
  }

  async updateReturn(returnId, updateData) {
    return await Return.findByIdAndUpdate(returnId, updateData, {
      new: true,
      runValidators: true,
    });
  }

  async updateReturnStatus(returnId, status) {
    return await Return.findByIdAndUpdate(
      returnId,
      { status },
      { new: true }
    );
  }

  async deleteReturn(returnId) {
    return await Return.findByIdAndDelete(returnId);
  }
}

module.exports = ReturnRepository;
