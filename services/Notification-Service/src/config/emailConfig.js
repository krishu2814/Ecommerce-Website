const nodemailer = require("nodemailer");
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  NODE_ENV,
} = require("./serverConfig");

let transporter = null;

const createTransporter = async () => {
  if (transporter) return transporter;

  try {
    if (SMTP_HOST && SMTP_USER && SMTP_USER !== "mock_user@ethereal.email") {
      transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });
      console.log(`[Notification Transporter] Initialized SMTP Transporter (${SMTP_HOST}:${SMTP_PORT})`);
    } else {
      // In development / testing, create an in-memory test account or JSON stream transport
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      console.log("[Notification Transporter] Initialized In-Memory JSON Mock Transporter for Development/Testing");
    }
  } catch (err) {
    console.warn("[Notification Transporter] Failed to create SMTP Transporter, falling back to JSON transport:", err.message);
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }

  return transporter;
};

module.exports = { createTransporter };
