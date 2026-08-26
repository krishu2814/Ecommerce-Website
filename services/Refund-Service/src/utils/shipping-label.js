class ShippingLabelUtil {
  static generateLabel({ returnId, orderId, pickupAddress }) {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const trackingNumber = `RET-TRK-${timestamp}-${randomSuffix}`;
    const labelId = `LBL-${timestamp}`;
    const carrier = "Express Logistics Returns";

    return {
      labelId,
      trackingNumber,
      carrier,
      labelUrl: `https://logistics.ecommerce.local/labels/${labelId}.pdf`,
      pickupAddress: pickupAddress || "Standard Customer Address on File",
      generatedAt: new Date(),
    };
  }
}

module.exports = ShippingLabelUtil;
