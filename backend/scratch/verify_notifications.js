import { Writable } from 'stream';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import fs from 'fs';
import admin from 'firebase-admin';

// 1. Mock firebase-admin SDK BEFORE importing config and app files
admin.initializeApp = () => ({});
admin.credential = {
  cert: () => ({})
};

// Create a dummy credentials file dynamically to satisfy fs.existsSync checks
const dummyPath = 'scratch/dummy_credentials.json';
fs.writeFileSync(dummyPath, JSON.stringify({ project_id: 'mock-cityfix' }));
process.env.FIREBASE_SERVICE_ACCOUNT_PATH = dummyPath;

// Setup environment variables in case they aren't loaded
process.env.JWT_SECRET = 'super_secret_jwt_sign_key_for_cityfix_backend_2026';
process.env.JWT_EXPIRES_IN = '7d';

console.log('------------------------------------------------------------');
console.log('🧪 CityFix Firebase FCM Push System - Programmatic Tests');
console.log('------------------------------------------------------------');

// 2. Mock Firebase messaging multicast sending and response mapping
let multicastPayloadSent = null;

Object.defineProperty(admin, 'messaging', {
  value: () => {
    return {
      sendEachForMulticast: async (message) => {
        multicastPayloadSent = message;
        
        const responses = message.tokens.map((token) => {
          if (token === 'expired_token_123') {
            return {
              success: false,
              error: {
                code: 'messaging/registration-token-not-registered',
                message: 'Token is no longer valid or unregistered.'
              }
            };
          }
          return { success: true };
        });
        return { responses };
      }
    };
  },
  configurable: true,
  writable: true
});

// 3. Define Automated Test Assertions Suite
const runTests = async () => {
  // Dynamically import app components after environmental configurations are set up
  const { default: app } = await import('../app.js');
  const { default: User } = await import('../models/User.js');
  const { default: Complaint } = await import('../models/Complaint.js');
  const { default: StatusLog } = await import('../models/StatusLog.js');
  const { default: Notification } = await import('../models/Notification.js');

  const mockUsers = [];
  const mockComplaints = [];
  const mockStatusLogs = [];
  const mockNotifications = [];

  // Seed citizen and admin users
  const citizenUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Jane Citizen',
    email: 'jane@citizen.com',
    role: 'citizen',
    phone: '5555555555',
    fcmTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    save: async function() {
      const idx = mockUsers.findIndex(u => u._id.toString() === this._id.toString());
      if (idx !== -1) {
        mockUsers[idx].fcmTokens = this.fcmTokens;
      }
      return this;
    }
  };

  const adminUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Super Admin',
    email: 'admin@cityfix.gov',
    role: 'admin',
    phone: '2222222222',
    fcmTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  mockUsers.push(citizenUser, adminUser);

  const citizenToken = jwt.sign({ id: citizenUser._id.toString() }, process.env.JWT_SECRET);
  const adminToken = jwt.sign({ id: adminUser._id.toString() }, process.env.JWT_SECRET);

  // 4. Overwrite Mongoose Model operations with in-memory array mocks
  User.findById = (id) => {
    const found = mockUsers.find((u) => u._id.toString() === id.toString());
    const queryChain = {
      select: (fields) => Promise.resolve(found),
      then: (resolve) => resolve(found),
    };
    return queryChain;
  };

  User.updateMany = async (filter, update) => {
    const tokensToRemove = update.$pull.fcmTokens.$in;
    mockUsers.forEach(user => {
      if (user.fcmTokens) {
        user.fcmTokens = user.fcmTokens.filter(t => !tokensToRemove.includes(t));
      }
    });
    return Promise.resolve({ modifiedCount: 1 });
  };

  Complaint.findById = (id) => {
    const found = mockComplaints.find((c) => c._id.toString() === id.toString());
    const queryChain = {
      populate: function() { return this; },
      then: (resolve) => resolve(found),
    };
    return queryChain;
  };

  StatusLog.create = async (logData) => {
    const newLog = {
      _id: new mongoose.Types.ObjectId(),
      ...logData,
      createdAt: new Date(),
    };
    mockStatusLogs.push(newLog);
    return Promise.resolve(newLog);
  };

  Notification.create = async (notificationData) => {
    const newNotification = {
      _id: new mongoose.Types.ObjectId(),
      ...notificationData,
      createdAt: new Date(),
    };
    mockNotifications.push(newNotification);
    return Promise.resolve(newNotification);
  };

  let errorsCount = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`✅ SUCCESS: ${message}`);
    } else {
      console.error(`❌ FAILURE: ${message}`);
      errorsCount++;
    }
  };

  try {
    // ------------------------------------------------------------------
    // TEST 1: Register FCM device token successfully
    // ------------------------------------------------------------------
    console.log('\n[TEST 1] Registering a new FCM token for Jane Citizen...');
    
    const regRes = await request(app)
      .post('/api/v1/notifications/register-token')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ token: 'valid_token_abc' });

    assert(regRes.statusCode === 200, 'Token registration yields status code 200.');
    assert(regRes.body.success === true, 'Response success flag is true.');
    assert(regRes.body.data.fcmTokens.includes('valid_token_abc'), 'User device token is saved.');
    assert(citizenUser.fcmTokens.includes('valid_token_abc'), 'Memory state contains new registered token.');

    // ------------------------------------------------------------------
    // TEST 2: Register duplicate FCM token (prevention check)
    // ------------------------------------------------------------------
    console.log('\n[TEST 2] Registering duplicate FCM token...');
    
    const dupRes = await request(app)
      .post('/api/v1/notifications/register-token')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ token: 'valid_token_abc' });

    assert(dupRes.statusCode === 200, 'Duplicate registration call returns 200.');
    assert(citizenUser.fcmTokens.length === 1, 'Duplicate token was ignored (token array size is still 1).');

    // ------------------------------------------------------------------
    // TEST 3: Validation gate check (short token)
    // ------------------------------------------------------------------
    console.log('\n[TEST 3] Testing validator rejection for bad tokens...');
    
    const badRes = await request(app)
      .post('/api/v1/notifications/register-token')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ token: 'bad' }); // too short

    assert(badRes.statusCode === 400, 'Short token rejects with status code 400.');
    assert(badRes.body.success === false, 'Response success flag is false.');

    // ------------------------------------------------------------------
    // TEST 4: Trigger status update and verify push payload integrations
    // ------------------------------------------------------------------
    console.log('\n[TEST 4] Triggering complaint status update to verify FCM integration...');
    
    // Seed a mock complaint
    const complaint = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Water Leakage Sector 4',
      citizen: citizenUser,
      status: 'Submitted',
      save: async function() {
        const idx = mockComplaints.findIndex(c => c._id.toString() === this._id.toString());
        if (idx !== -1) {
          mockComplaints[idx].status = this.status;
        }
        return this;
      }
    };
    mockComplaints.push(complaint);

    const statusUpdateRes = await request(app)
      .patch(`/api/v1/complaints/${complaint._id.toString()}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'Under Review',
        remarks: 'Engineering crew assigned to investigate.'
      });

    assert(statusUpdateRes.statusCode === 200, 'Status update returns status code 200.');
    assert(multicastPayloadSent !== null, 'Firebase multicast send each was triggered.');
    assert(multicastPayloadSent.tokens.includes('valid_token_abc'), 'Recipient token was target multicast.');
    assert(multicastPayloadSent.notification.title === 'Complaint Status Update', 'Payload maps title correctly.');
    assert(multicastPayloadSent.data.complaintId === complaint._id.toString(), 'Payload maps complaint ID data fields.');

    // ------------------------------------------------------------------
    // TEST 5: Automatic database token pruning for expired tokens
    // ------------------------------------------------------------------
    console.log('\n[TEST 5] Testing automatic expired token database pruning...');
    
    // Push an expired token to user list
    citizenUser.fcmTokens.push('expired_token_123');
    assert(citizenUser.fcmTokens.length === 2, 'User has 2 tokens (1 valid, 1 expired).');

    // Trigger status update again to trigger push multicast
    multicastPayloadSent = null;
    
    const pruneUpdateRes = await request(app)
      .patch(`/api/v1/complaints/${complaint._id.toString()}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'Assigned',
        remarks: 'Assigned crew.'
      });

    assert(pruneUpdateRes.statusCode === 200, 'Status update returns status code 200.');
    assert(multicastPayloadSent.tokens.includes('expired_token_123'), 'Multicast was dispatched to expired token.');
    assert(!citizenUser.fcmTokens.includes('expired_token_123'), 'Expired token was automatically pruned from database.');
    assert(citizenUser.fcmTokens.length === 1, 'Citizen has exactly 1 valid token remaining in database.');

    console.log('\n------------------------------------------------------------');
    if (errorsCount === 0) {
      console.log('🎉 ALL FIREBASE FCM PUSH SYSTEM TESTS COMPLETED SUCCESSFULLY WITH ZERO ERRORS.');
    } else {
      console.error(`🚨 INTEGRATION TESTS FAILED: ${errorsCount} Assertions Failed.`);
      process.exit(1);
    }
    console.log('------------------------------------------------------------\n');

  } catch (error) {
    console.error('Test Execution Thread Threw Exception:', error);
    process.exit(1);
  } finally {
    // 5. Clean up dummy JSON credential file
    if (fs.existsSync(dummyPath)) {
      fs.unlinkSync(dummyPath);
    }
  }
};

// Start execution
runTests();
