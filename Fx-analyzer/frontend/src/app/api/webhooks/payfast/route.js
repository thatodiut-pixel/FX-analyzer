import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Replace with your actual PayFast passphrase
const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || 'your-secure-passphrase-here';
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

// Helper to generate PayFast signature to verify authenticity
function generateSignature(data, passPhrase = null) {
  let payload = "";
  for (let key in data) {
    if (key !== "signature" && data[key] !== "") {
      payload += key + "=" + encodeURIComponent(data[key].trim()).replace(/%20/g, "+") + "&";
    }
  }
  let getString = payload.slice(0, -1);
  if (passPhrase !== null) {
    getString += `&passphrase=${encodeURIComponent(passPhrase.trim()).replace(/%20/g, "+")}`;
  }
  return crypto.createHash("md5").update(getString).digest("hex");
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const data = Object.fromEntries(formData);
    
    // Verify the PayFast ITN signature
    const signature = generateSignature(data, PAYFAST_PASSPHRASE);
    if (data.signature !== signature) {
      console.error("PayFast signature mismatch.");
      return NextResponse.json({ error: "Invalid Signature" }, { status: 400 });
    }

    // Verify payment was complete
    if (data.payment_status === "COMPLETE") {
      const userEmail = data.email_address;
      const apiKey = process.env.API_KEY || 'fx-analyzer-secure-key-2026';

      console.log(`[PAYFAST] Successful payment for ${userEmail}. Upgrading account...`);

      // Server-to-Server call to upgrade the user
      const upgradeRes = await fetch(`${BACKEND_URL}/api/admin/upgrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({ email: userEmail })
      });

      if (!upgradeRes.ok) {
        throw new Error("Failed to upgrade user on backend");
      }

      return NextResponse.json({ success: true }, { status: 200 });
    } else {
       return NextResponse.json({ success: true, message: "Ignored status" }, { status: 200 });
    }

  } catch (error) {
    console.error("PayFast Webhook Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
