
import { onCall, HttpsError } from "firebase-functions/v2/https";
import axios from "axios";
import { defineString } from "firebase-functions/params";
import * as admin from "firebase-admin";

// Initialize the Firebase Admin SDK if it hasn't been already.
// This is crucial for v2 functions which are deployed separately.
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const GC_BASE = "https://bankaccountdata.gocardless.com/api/v2";
const GOCARDLESS_SECRET_ID = defineString("GOCARDLESS_SECRET_ID");
const GOCARDLESS_SECRET_KEY = defineString("GOCARDLESS_SECRET_KEY");

// Helper to get auth credentials
const getAuthCredentials = () => {
    const secret_id = GOCARDLESS_SECRET_ID.value();
    const secret_key = GOCARDLESS_SECRET_KEY.value();
    if (!secret_id || !secret_key) {
        console.error("GoCardless secrets are not configured in Firebase environment.");
        throw new HttpsError("internal", "Server configuration error.");
    }
    return { username: secret_id, password: secret_key };
};

/**
 * Creates a bank link (requisition).
 * Requires: bankId, redirectUrl
 */
export const createBankLink = onCall(async (request) => {
  const { bankId, redirectUrl } = request.data;
  const context = request.auth;

  if (!context?.uid) throw new HttpsError("unauthenticated", "Must be logged in.");

  try {
    const auth = getAuthCredentials();
    const agreementRes = await axios.post(`${GC_BASE}/agreements/enduser/`, {
      enduser_id: context.uid,
      max_historical_days: 90,
      access_valid_for_days: 30,
      access_scope: ["balances", "details", "transactions"],
    }, { auth });

    const requisitionRes = await axios.post(`${GC_BASE}/requisitions/`, {
      redirect: redirectUrl,
      institution_id: bankId,
      reference: `user-${context.uid}`,
      agreement: agreementRes.data.id,
      user_language: "EN",
      account_selection: true, // Allow user to select which accounts to link
    }, { auth });

    // Return the link for redirection and the ID for later processing
    return { link: requisitionRes.data.link, requisitionId: requisitionRes.data.id };
  } catch (error: any) {
    console.error("GoCardless createBankLink error:", error.response?.data || error.message);
    throw new HttpsError("internal", "Failed to create bank linking session.");
  }
});

/**
 * Completes the connection after user authorizes with their bank.
 * Requires: requisitionId
 */
export const completeBankConnection = onCall(async (request) => {
    const { requisitionId } = request.data;
    const context = request.auth;
  
    if (!context?.uid) throw new HttpsError("unauthenticated", "Must be logged in.");
    if (!requisitionId) throw new HttpsError("invalid-argument", "Requisition ID is required.");
  
    try {
        const auth = getAuthCredentials();
        const requisitionRes = await axios.get(`${GC_BASE}/requisitions/${requisitionId}/`, { auth });
        const requisitionData = requisitionRes.data;

        if (requisitionData.status !== 'LINKED') {
            throw new HttpsError('failed-precondition', `Requisition status is ${requisitionData.status}, not LINKED.`);
        }

        const institutionRes = await axios.get(`${GC_BASE}/institutions/${requisitionData.institution_id}/`, { auth });
        const institutionData = institutionRes.data;

        const db = admin.firestore();
        const batch = db.batch();

        for (const accountId of requisitionData.accounts) {
            const accountRef = db.collection('users').doc(context.uid).collection('bankConnections').doc(accountId);
            const accountDetailsRes = await axios.get(`${GC_BASE}/accounts/${accountId}/`, { auth });
            const accountDetails = accountDetailsRes.data;

            batch.set(accountRef, {
                id: accountId,
                requisitionId: requisitionId,
                institutionId: requisitionData.institution_id,
                institutionName: institutionData.name,
                institutionLogo: institutionData.logo,
                iban: accountDetails.iban,
                accountName: accountDetails.name,
                ownerName: accountDetails.owner_name,
                linkedAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'active'
            });
        }
  
        await batch.commit();
        return { success: true, accountsLinked: requisitionData.accounts.length };

    } catch (error: any) {
      console.error("GoCardless completeBankConnection error:", error.response?.data || error.message);
      throw new HttpsError("internal", "Failed to finalize bank connection.");
    }
});
