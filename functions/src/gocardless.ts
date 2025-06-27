import {onCall, HttpsError} from 'firebase-functions/v2/https';
import {defineSecret} from 'firebase-functions/params';

import axios from 'axios';
import * as admin from 'firebase-admin';

const GC_BASE = 'https://bankaccountdata.gocardless.com/api/v2';

// Declare secrets
const GOCARDLESS_SECRET_ID = defineSecret('GOCARDLESS_SECRET_ID');
const GOCARDLESS_SECRET_KEY = defineSecret('GOCARDLESS_SECRET_KEY');

// Helper to validate Axios error
function isAxiosError(error: unknown): error is {response?: any; message: string} {
  return typeof error === 'object' && error !== null && 'message' in error;
}

// Shared credential loader
const getAuthCredentials = () => {
  const secretId = process.env.GOCARDLESS_SECRET_ID;
  const secretKey = process.env.GOCARDLESS_SECRET_KEY;

  if (!secretId || !secretKey) {
    console.error('Missing GoCardless credentials in environment.');
    throw new HttpsError('internal', 'Server config error: missing GoCardless credentials.');
  }

  return {username: secretId, password: secretKey};
};

type AgreementResponse = {id: string};
type RequisitionResponse = {id: string; link: string};
type RequisitionDetail = {
  institution_id: string;
  status: string;
  accounts: string[];
};
type Institution = {name: string; logo: string};
type AccountDetails = {
  iban: string;
  name: string;
  owner_name: string;
};

export const createBankLink = onCall(
  {
    secrets: [GOCARDLESS_SECRET_ID, GOCARDLESS_SECRET_KEY],
  },
  async (request) => {
    const {bankId, redirectUrl} = request.data;
    const context = request.auth;

    if (!context?.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    if (!bankId || !redirectUrl) {
      throw new HttpsError('invalid-argument', 'Missing bankId or redirectUrl.');
    }

    try {
      const auth = getAuthCredentials();

      const agreementRes = await axios.post<AgreementResponse>(
        `${GC_BASE}/agreements/enduser/`,
        {
          enduser_id: context.uid,
          max_historical_days: 90,
          access_valid_for_days: 30,
          access_scope: ['balances', 'details', 'transactions'],
        },
        {auth}
      );

      const agreementId = agreementRes.data.id;

      const requisitionRes = await axios.post<RequisitionResponse>(
        `${GC_BASE}/requisitions/`,
        {
          redirect: redirectUrl,
          institution_id: bankId,
          reference: `user-${context.uid}`,
          agreement: agreementId,
          user_language: 'EN',
          account_selection: true,
        },
        {auth}
      );

      return {
        link: requisitionRes.data.link,
        requisitionId: requisitionRes.data.id,
      };
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        const message = error.response?.data || error.message;
        console.error('🔥 GoCardless createBankLink FAILED:', JSON.stringify(message, null, 2));
        throw new HttpsError('internal', JSON.stringify(message));
      } else {
        console.error('🔥 Unexpected error in createBankLink:', error);
        throw new HttpsError('internal', 'Unknown error occurred.');
      }
    }
  }
);

export const completeBankConnection = onCall(
  {
    secrets: [GOCARDLESS_SECRET_ID, GOCARDLESS_SECRET_KEY],
  },
  async (request) => {
    const {requisitionId} = request.data;
    const context = request.auth;

    if (!context?.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    if (!requisitionId) {
      throw new HttpsError('invalid-argument', 'Missing requisitionId.');
    }

    try {
      const auth = getAuthCredentials();

      const requisitionRes = await axios.get<RequisitionDetail>(
        `${GC_BASE}/requisitions/${requisitionId}/`,
        {auth}
      );
      const requisitionData = requisitionRes.data;

      if (requisitionData.status !== 'LINKED') {
        throw new HttpsError('failed-precondition', `Requisition not linked: status is ${requisitionData.status}`);
      }

      const institutionRes = await axios.get<Institution>(
        `${GC_BASE}/institutions/${requisitionData.institution_id}/`,
        {auth}
      );
      const institutionData = institutionRes.data;

      const db = admin.firestore();
      const batch = db.batch();

      for (const accountId of requisitionData.accounts) {
        const accountRef = db
          .collection('users')
          .doc(context.uid)
          .collection('bankConnections')
          .doc(accountId);

        const accountDetailsRes = await axios.get<AccountDetails>(
          `${GC_BASE}/accounts/${accountId}/`,
          {auth}
        );
        const accountDetails = accountDetailsRes.data;

        batch.set(accountRef, {
          id: accountId,
          requisitionId,
          institutionId: requisitionData.institution_id,
          institutionName: institutionData.name,
          institutionLogo: institutionData.logo,
          iban: accountDetails.iban,
          accountName: accountDetails.name,
          ownerName: accountDetails.owner_name,
          linkedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'active',
        });
      }

      await batch.commit();
      return {
        success: true,
        accountsLinked: requisitionData.accounts.length,
      };
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        const message = error.response?.data || error.message;
        console.error('🔥 GoCardless completeBankConnection FAILED:', JSON.stringify(message, null, 2));
        throw new HttpsError('internal', JSON.stringify(message));
      } else {
        console.error('🔥 Unexpected error in completeBankConnection:', error);
        throw new HttpsError('internal', 'Unknown error occurred.');
      }
    }
  }
);
