import admin from 'firebase-admin';
import fs from 'fs';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

// Load environment variables (failsafe in testing contexts)
dotenv.config();

let firebaseApp = null;
let isFirebaseEnabled = false;

try {
  const credentialsPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (credentialsPath && fs.existsSync(credentialsPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    isFirebaseEnabled = true;
    logger.info('Firebase Admin SDK successfully initialized.');
  } else {
    logger.warn('FIREBASE_SERVICE_ACCOUNT_PATH is missing or file does not exist. Push notifications are running in MOCK/DISABLED mode.');
  }
} catch (error) {
  logger.error('Firebase Admin SDK failed to initialize. Running in MOCK/DISABLED mode:', error);
}

export { admin, firebaseApp, isFirebaseEnabled };
export default { admin, firebaseApp, isFirebaseEnabled };
