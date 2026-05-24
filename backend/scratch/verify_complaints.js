import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import StatusLog from '../models/StatusLog.js';
import Notification from '../models/Notification.js';

// Setup environment variables in case they aren't loaded
process.env.JWT_SECRET = 'super_secret_jwt_sign_key_for_cityfix_backend_2026';
process.env.JWT_EXPIRES_IN = '7d';

console.log('------------------------------------------------------------');
console.log('🧪 CityFix Complaint Management Module - Programmatic Tests');
console.log('------------------------------------------------------------');

// 1. Initialize local in-memory mock database state
const mockUsers = [];
const mockComplaints = [];
const mockStatusLogs = [];
const mockNotifications = [];

// Seed users for different roles
const citizenUser = {
  _id: new mongoose.Types.ObjectId(),
  name: 'John Citizen',
  email: 'john@citizen.com',
  role: 'citizen',
  phone: '1111111111',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const adminUser = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Super Admin',
  email: 'admin@cityfix.gov',
  role: 'admin',
  phone: '2222222222',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const authorityUser = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Road Authority',
  email: 'authority@cityfix.gov',
  role: 'authority',
  phone: '3333333333',
  createdAt: new Date(),
  updatedAt: new Date(),
};

mockUsers.push(citizenUser, adminUser, authorityUser);

// Generate JWT tokens for authentication headers
const citizenToken = jwt.sign({ id: citizenUser._id.toString() }, process.env.JWT_SECRET);
const adminToken = jwt.sign({ id: adminUser._id.toString() }, process.env.JWT_SECRET);
const authorityToken = jwt.sign({ id: authorityUser._id.toString() }, process.env.JWT_SECRET);

// 2. Overwrite Mongoose Model operations with in-memory array mocks
User.findById = (id) => {
  const found = mockUsers.find((u) => u._id.toString() === id.toString());
  const queryChain = {
    select: (fields) => Promise.resolve(found),
    then: (resolve) => resolve(found),
  };
  return queryChain;
};

Complaint.create = async (complaintData) => {
  const newComplaint = {
    _id: new mongoose.Types.ObjectId(),
    ...complaintData,
    status: complaintData.status || 'Submitted',
    priority: complaintData.priority || 'medium',
    images: complaintData.images || [],
    assignedAuthority: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: async function() {
      // Simulate post-update save changes mirroring in main mock state
      const idx = mockComplaints.findIndex(c => c._id.toString() === this._id.toString());
      if (idx !== -1) {
        mockComplaints[idx].status = this.status;
        mockComplaints[idx].updatedAt = new Date();
      }
      return this;
    }
  };
  mockComplaints.push(newComplaint);
  return Promise.resolve(newComplaint);
};

Complaint.findById = (id) => {
  const found = mockComplaints.find((c) => c._id.toString() === id.toString());
  const populateFields = [];

  const queryChain = {
    populate: function(field) {
      populateFields.push(field);
      return this;
    },
    then: (resolve) => {
      if (!found) return resolve(null);

      const result = { ...found };

      if (populateFields.includes('citizen')) {
        result.citizen = mockUsers.find(u => u._id.toString() === found.citizen.toString()) || found.citizen;
      }
      if (populateFields.includes('assignedAuthority')) {
        result.assignedAuthority = found.assignedAuthority 
          ? (mockUsers.find(u => u._id.toString() === found.assignedAuthority.toString()) || found.assignedAuthority)
          : null;
      }

      result.save = async function() {
        const idx = mockComplaints.findIndex(c => c._id.toString() === this._id.toString());
        if (idx !== -1) {
          mockComplaints[idx].status = this.status;
          mockComplaints[idx].updatedAt = new Date();
        }
        return this;
      };

      return resolve(result);
    }
  };

  return queryChain;
};

Complaint.find = (query) => {
  const populateFields = [];

  const queryChain = {
    populate: function(field) {
      populateFields.push(field);
      return this;
    },
    sort: function() { return this; },
    skip: function() { return this; },
    limit: function() { return this; },
    then: (resolve) => {
      let filtered = [...mockComplaints];

      if (query.status) {
        filtered = filtered.filter(c => c.status === query.status);
      }
      if (query.category) {
        filtered = filtered.filter(c => c.category === query.category);
      }
      if (query.priority) {
        filtered = filtered.filter(c => c.priority === query.priority);
      }
      if (query.citizen) {
        filtered = filtered.filter(c => c.citizen.toString() === query.citizen.toString());
      }

      const results = filtered.map(c => {
        const result = { ...c };
        if (populateFields.includes('citizen')) {
          result.citizen = mockUsers.find(u => u._id.toString() === c.citizen.toString()) || c.citizen;
        }
        if (populateFields.includes('assignedAuthority')) {
          result.assignedAuthority = c.assignedAuthority 
            ? (mockUsers.find(u => u._id.toString() === c.assignedAuthority.toString()) || c.assignedAuthority)
            : null;
        }
        return result;
      });

      return resolve(results);
    }
  };
  return queryChain;
};

Complaint.countDocuments = async (query) => {
  let filtered = [...mockComplaints];

  if (query.status) {
    filtered = filtered.filter(c => c.status === query.status);
  }
  if (query.category) {
    filtered = filtered.filter(c => c.category === query.category);
  }
  if (query.priority) {
    filtered = filtered.filter(c => c.priority === query.priority);
  }
  if (query.citizen) {
    filtered = filtered.filter(c => c.citizen.toString() === query.citizen.toString());
  }

  return Promise.resolve(filtered.length);
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

StatusLog.find = (query) => {
  const queryChain = {
    populate: function() { return this; },
    sort: function() { return this; },
    then: (resolve) => {
      let filtered = [...mockStatusLogs];
      if (query.complaint) {
        filtered = filtered.filter(log => log.complaint.toString() === query.complaint.toString());
      }

      // Populate changedBy
      const results = filtered.map(log => ({
        ...log,
        changedBy: mockUsers.find(u => u._id.toString() === log.changedBy.toString()) || log.changedBy,
      }));

      return resolve(results);
    }
  };
  return queryChain;
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

// 3. Define Automated Test Assertions Suite
const runTests = async () => {
  let testComplaintId = '';
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
    // TEST 1: Citizen Files a Complaint successfully
    // ------------------------------------------------------------------
    console.log('\n[TEST 1] Citizen filing a civic issue complaint...');
    const createRes = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: 'Large Pothole on Main St',
        description: 'There is a huge dangerous pothole in the middle of Main Street near intersection 4.',
        category: 'pothole',
        priority: 'high',
        longitude: 77.5946,
        latitude: 12.9716,
        address: 'Main Street, Bengaluru, Karnataka',
      });

    assert(createRes.statusCode === 201, 'Complaint creation returns 201 Created.');
    assert(createRes.body.success === true, 'Response success is true.');
    assert(createRes.body.data._id !== undefined, 'Complaint document yields database ID.');
    assert(createRes.body.data.status === 'Submitted', 'Default status is automatically assigned to "Submitted".');
    assert(createRes.body.data.location.coordinates[0] === 77.5946, 'Coordinates are correctly saved inside GeoJSON format.');
    
    testComplaintId = createRes.body.data._id;

    // Verify initial StatusLog creation
    const initialLog = mockStatusLogs.find(log => log.complaint.toString() === testComplaintId.toString());
    assert(initialLog !== undefined, 'An initial status log audit record was created.');
    assert(initialLog.newStatus === 'Submitted', 'StatusLog documents initial status as "Submitted".');
    assert(initialLog.previousStatus === 'none', 'StatusLog sets previous status to "none".');

    // ------------------------------------------------------------------
    // TEST 2: Zod Request Payload Validator Gate (fails category check)
    // ------------------------------------------------------------------
    console.log('\n[TEST 2] Verifying Zod validation rejects invalid category & missing address...');
    const invalidCategoryRes = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: 'Water Leak',
        description: 'Water leak in the backyard.',
        category: 'invalid_category_name',
        longitude: 77.5946,
        latitude: 12.9716,
      });

    assert(invalidCategoryRes.statusCode === 400, 'Invalid category/missing fields reject with status 400.');
    assert(invalidCategoryRes.body.success === false, 'Response success flag is false.');
    assert(invalidCategoryRes.body.errors !== undefined, 'Validation returns detailed Zod error reasons.');

    // ------------------------------------------------------------------
    // TEST 3: Citizen retrieves their own complaints list
    // ------------------------------------------------------------------
    console.log('\n[TEST 3] Citizen retrieving own complaints...');
    const citizenListRes = await request(app)
      .get('/api/v1/complaints')
      .set('Authorization', `Bearer ${citizenToken}`);

    assert(citizenListRes.statusCode === 200, 'Citizen complaints retrieval returns 200.');
    assert(citizenListRes.body.data.complaints.length === 1, 'Citizen retrieves exactly 1 filed complaint.');
    assert(citizenListRes.body.data.pagination.totalCount === 1, 'Total complaints count matches page size.');

    // ------------------------------------------------------------------
    // TEST 4: Citizens are restricted from other citizens\' complaints unless using geospatial query
    // ------------------------------------------------------------------
    console.log('\n[TEST 4] Restricting citizens from fetching complaints with other roles without geospatial inputs...');
    // Create another user
    const otherCitizen = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Bob Citizen',
      email: 'bob@citizen.com',
      role: 'citizen',
      phone: '4444444444',
    };
    mockUsers.push(otherCitizen);
    const otherToken = jwt.sign({ id: otherCitizen._id.toString() }, process.env.JWT_SECRET);

    const otherListRes = await request(app)
      .get('/api/v1/complaints')
      .set('Authorization', `Bearer ${otherToken}`);

    assert(otherListRes.statusCode === 200, 'Retrieval for other citizen returns 200.');
    assert(otherListRes.body.data.complaints.length === 0, 'Citizen sees 0 complaints of others.');

    // ------------------------------------------------------------------
    // TEST 5: Admin retrieves all complaints with filters and pagination
    // ------------------------------------------------------------------
    console.log('\n[TEST 5] Admin retrieving all global complaints and verifying status/category filters...');
    const adminListRes = await request(app)
      .get('/api/v1/complaints?status=Submitted&category=pothole')
      .set('Authorization', `Bearer ${adminToken}`);

    assert(adminListRes.statusCode === 200, 'Admin global list retrieval returns 200.');
    assert(adminListRes.body.data.complaints.length === 1, 'Admin correctly retrieves matching pothole complaint.');

    // ------------------------------------------------------------------
    // TEST 6: Get individual complaint by ID with status log timeline
    // ------------------------------------------------------------------
    console.log('\n[TEST 6] Fetching complaint details by ID with populated timeline history...');
    const detailsRes = await request(app)
      .get(`/api/v1/complaints/${testComplaintId}`)
      .set('Authorization', `Bearer ${citizenToken}`);

    assert(detailsRes.statusCode === 200, 'Detail retrieval returns 200.');
    assert(detailsRes.body.data.complaint._id === testComplaintId, 'Detail matches requested complaint ID.');
    assert(detailsRes.body.data.timeline.length === 1, 'History timeline contains 1 transition log.');
    assert(detailsRes.body.data.timeline[0].newStatus === 'Submitted', 'Timeline shows initial registration log.');

    // ------------------------------------------------------------------
    // TEST 7: Restrict other citizen from direct detail access to another citizen\'s complaint
    // ------------------------------------------------------------------
    console.log('\n[TEST 7] Direct forbidden gate check on private complaint details...');
    const forbiddenDetailsRes = await request(app)
      .get(`/api/v1/complaints/${testComplaintId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    assert(forbiddenDetailsRes.statusCode === 403, 'Unauthorized detail query correctly returns 403 Forbidden.');
    assert(forbiddenDetailsRes.body.message.includes('Forbidden access'), 'Semantic access restriction message returned.');

    // ------------------------------------------------------------------
    // TEST 8: Admin updates complaint status successfully and triggers audits
    // ------------------------------------------------------------------
    console.log('\n[TEST 8] Admin updating complaint status and logging audits...');
    const statusUpdateRes = await request(app)
      .patch(`/api/v1/complaints/${testComplaintId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'Under Review',
        remarks: 'Assigned an investigator to inspect the pothole size.',
      });

    assert(statusUpdateRes.statusCode === 200, 'Admin status patch returns 200 OK.');
    assert(statusUpdateRes.body.data.complaint.status === 'Under Review', 'Complaint status updated to "Under Review".');
    assert(statusUpdateRes.body.data.log.previousStatus === 'Submitted', 'Audit log captures correct previousStatus.');
    assert(statusUpdateRes.body.data.log.newStatus === 'Under Review', 'Audit log captures newStatus.');

    // Verify Notification creation for the reporter
    const citizenNotification = mockNotifications.find(n => {
      const recipientId = n.recipient._id ? n.recipient._id.toString() : n.recipient.toString();
      return recipientId === citizenUser._id.toString();
    });
    assert(citizenNotification !== undefined, 'A notification record was sent to the citizen.');
    assert(citizenNotification.type === 'complaint_status', 'Notification type is set to "complaint_status".');

    // ------------------------------------------------------------------
    // TEST 9: Non-Admin attempts status update change
    // ------------------------------------------------------------------
    console.log('\n[TEST 9] Asserting citizens/authorities are restricted from modifying statuses...');
    const citizenPatchRes = await request(app)
      .patch(`/api/v1/complaints/${testComplaintId}/status`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ status: 'Resolved' });

    assert(citizenPatchRes.statusCode === 403, 'Citizen status patch is rejected with 403.');

    const authorityPatchRes = await request(app)
      .patch(`/api/v1/complaints/${testComplaintId}/status`)
      .set('Authorization', `Bearer ${authorityToken}`)
      .send({ status: 'Resolved' });

    assert(authorityPatchRes.statusCode === 403, 'Authority status patch is also rejected with 403.');

    // ------------------------------------------------------------------
    // TEST 10: Validation for status enum options (bad status name)
    // ------------------------------------------------------------------
    console.log('\n[TEST 10] Testing validation error for unrecognized status names...');
    const invalidStatusRes = await request(app)
      .patch(`/api/v1/complaints/${testComplaintId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'InvalidStateName' });

    assert(invalidStatusRes.statusCode === 400, 'Zod validator blocks invalid enum status value with 400.');

    console.log('\n------------------------------------------------------------');
    if (errorsCount === 0) {
      console.log('🎉 ALL COMPLAINT MODULE INTEGRATION TESTS COMPLETED SUCCESSFULLY WITH ZERO ERRORS.');
    } else {
      console.error(`🚨 INTEGRATION TESTS FAILED: ${errorsCount} Assertions Failed.`);
      process.exit(1);
    }
    console.log('------------------------------------------------------------\n');

  } catch (error) {
    console.error('Test Execution Thread Threw Exception:', error);
    process.exit(1);
  }
};

// Start execution
runTests();
