
import { onCall } from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import axios from "axios";

const GC_BASE = "https://bankaccountdata.gocardless.com/api/v2";

/**
 * Firebase Callable Function to create a bank link (requisition)
 * Requires: bankId (e.g. 'ob-uk-sandbox'), redirectUrl (your callback URL)
 */
export const createBankLink = onCall(async (request) => {
  const { bankId, redirectUrl } = request.data;
  const context = request.auth;

  if (!context?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const secret_id = functions.config().gocardless.secret_id;
  const secret_key = functions.config().gocardless.secret_key;

  if (!secret_id || !secret_key) {
    console.error("GoCardless secrets are not configured in Firebase environment.");
    throw new functions.https.HttpsError("internal", "Server configuration error.");
  }

  const auth = { username: secret_id, password: secret_key };

  try {
    // 1. Create agreement
    const agreementRes = await axios.post(`${GC_BASE}/agreements/enduser/`, {
      enduser_id: context.uid,
      max_historical_days: 90,
      access_valid_for_days: 30,
      recurring: false // Changed to false for one-time access
    }, { auth });

    const agreementId = agreementRes.data.id;

    // 2. Create requisition
    const requisitionRes = await axios.post(`${GC_BASE}/requisitions/`, {
      redirect: redirectUrl,
      institution_id: bankId,
      reference: `user-${context.uid}`,
      agreement: agreementId,
      user_language: "EN",
    }, { auth });

    return { link: requisitionRes.data.link };
  } catch (error: any) {
    console.error("GoCardless error:", error.response?.data || error.message);
    throw new functions.https.HttpsError("internal", "Failed to create requisition.");
  }
});
