
import * as admin from 'firebase-admin';

// This single initialization is used by all functions imported below.
admin.initializeApp();

// Export all v1 functions from their own file
export * from './v1';

// Export all v2 functions from their own file
export * from './gocardless';
