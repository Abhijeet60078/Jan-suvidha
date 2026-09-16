import crypto from "crypto";
import bcrypt from "bcryptjs";
import OtpCode from "../models/OtpCode.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export const issueOtp = async (phone, purpose) => {
  const code = String(crypto.randomInt(100000, 1000000));
  await OtpCode.deleteMany({ phone, purpose });
  await OtpCode.create({
    phone,
    purpose,
    codeHash: await bcrypt.hash(code, 10),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    const body = new URLSearchParams({
      To: phone,
      From: process.env.TWILIO_PHONE_NUMBER,
      Body: `Your Jan Suvidha verification code is ${code}. It expires in 5 minutes.`,
    });
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) throw new Error("SMS provider rejected the OTP request");
  } else {
    console.log(`[OTP:${purpose}] ${phone}: ${code}`);
  }

  return process.env.NODE_ENV === "production" ? undefined : code;
};

export const consumeOtp = async (phone, purpose, code) => {
  const record = await OtpCode.findOne({ phone, purpose }).sort({ createdAt: -1 });
  if (!record || record.expiresAt < new Date() || record.attempts >= MAX_ATTEMPTS) return false;
  record.attempts += 1;
  const valid = await bcrypt.compare(String(code), record.codeHash);
  if (!valid) {
    await record.save();
    return false;
  }
  await record.deleteOne();
  return true;
};
