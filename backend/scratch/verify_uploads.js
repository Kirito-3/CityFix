import { Writable } from 'stream';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import StatusLog from '../models/StatusLog.js';
import Notification from '../models/Notification.js';
import cloudinary from '../config/cloudinary.js';

// Setup environment variables in case they aren't loaded
process.env.JWT_SECRET = 'super_secret_jwt_sign_key_for_cityfix_backend_2026';
process.env.JWT_EXPIRES_IN = '7d';

console.log('------------------------------------------------------------');
console.log('🧪 CityFix Cloudinary Upload System - Programmatic Tests');
console.log('------------------------------------------------------------');

// 1. Initialize local in-memory mock database state
const mockUsers = [];
const mockComplaints = [];
const mockStatusLogs = [];
const mockNotifications = [];

// Seed citizen user for auth
const citizenUser = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Jane Civic',
  email: 'jane@civic.com',
  role: 'citizen',
  phone: '5555555555',
  createdAt: new Date(),
  updatedAt: new Date(),
};
mockUsers.push(citizenUser);

const citizenToken = jwt.sign({ id: citizenUser._id.toString() }, process.env.JWT_SECRET);

// 2. Overwrite Mongoose Model operations
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
  };
  mockComplaints.push(newComplaint);
  return Promise.resolve(newComplaint);
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

// 3. Stub Cloudinary's uploader.upload_stream to avoid network requests
cloudinary.uploader.upload_stream = (options, callback) => {
  const mockWritable = new Writable({
    write(chunk, encoding, next) {
      next();
    },
    final(cb) {
      cb();
      const mockResult = {
        secure_url: `https://res.cloudinary.com/demo/image/upload/v12345/cityfix/complaints/mock_upload_${Date.now()}.png`,
        public_id: `cityfix/complaints/mock_upload_${Date.now()}`,
      };
      callback(null, mockResult);
    },
  });
  return mockWritable;
};

// 4. Define Automated Test Assertions Suite
const runTests = async () => {
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
    // TEST 1: Valid image upload & complaint creation (multipart/form-data)
    // ------------------------------------------------------------------
    console.log('\n[TEST 1] Filing a complaint with valid image files (multipart/form-data)...');
    
    // Create dummy image file buffers
    const dummyImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'); // 1px transparent PNG

    const multipartRes = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .field('title', 'Leaking Water Pipe')
      .field('description', 'Fresh water leaking on the street pavement.')
      .field('category', 'water_leakage')
      .field('priority', 'medium')
      .field('longitude', '77.5946') // String coordinates in multipart
      .field('latitude', '12.9716')
      .field('address', 'Water Works Main Rd, Sector 2')
      .attach('images', dummyImageBuffer, 'water_leak.png')
      .attach('images', dummyImageBuffer, 'pavement.jpg');

    assert(multipartRes.statusCode === 201, 'Request successfully files complaint (201 Created).');
    assert(multipartRes.body.success === true, 'Response success is true.');
    assert(multipartRes.body.data.images.length === 2, 'Complaint saves exactly 2 uploaded image URLs.');
    assert(multipartRes.body.data.images[0].includes('cloudinary.com'), 'Saved image URLs originate from Cloudinary secure domain.');
    assert(multipartRes.body.data.location.coordinates[0] === 77.5946, 'Zod preprocessor cast longitude string to float number.');

    // Verify initial StatusLog creation
    const complaintId = multipartRes.body.data._id;
    const initialLog = mockStatusLogs.find(log => log.complaint.toString() === complaintId.toString());
    assert(initialLog !== undefined, 'Chronological StatusLog record was successfully documented.');

    // ------------------------------------------------------------------
    // TEST 2: Rejection of invalid file mime-type (multipart/form-data)
    // ------------------------------------------------------------------
    console.log('\n[TEST 2] Verifying type gate rejects invalid text/exe files...');
    
    const badFileBuffer = Buffer.from('console.log("malicious code execution simulation");');

    const invalidTypeRes = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .field('title', 'Illegal Garbage Dump')
      .field('description', 'Huge trash piles left on the sidewalk.')
      .field('category', 'garbage')
      .field('longitude', '77.5946')
      .field('latitude', '12.9716')
      .field('address', 'Sidewalk Ave')
      .attach('images', badFileBuffer, 'malicious.js');

    assert(invalidTypeRes.statusCode === 400, 'Invalid file mime type yields 400 Bad Request.');
    assert(invalidTypeRes.body.success === false, 'Response success flag is false.');
    assert(invalidTypeRes.body.message.includes('Only JPG, JPEG, PNG, and WEBP'), 'Validation error alerts client about supported formats.');

    // ------------------------------------------------------------------
    // TEST 3: Oversized image rejection (>5MB)
    // ------------------------------------------------------------------
    console.log('\n[TEST 3] Verifying size gate blocks uploads larger than 5MB...');
    
    // Dynamically build a 5.1MB oversized buffer to trigger the Multer limit
    const oversizedBuffer = Buffer.alloc(5.1 * 1024 * 1024);

    const oversizedRes = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .field('title', 'Streetlight Failure')
      .field('description', 'Full block of streetlights are off.')
      .field('category', 'streetlight')
      .field('longitude', '77.5946')
      .field('latitude', '12.9716')
      .field('address', 'Dark St')
      .attach('images', oversizedBuffer, 'massive_image.png');

    assert(oversizedRes.statusCode === 400, 'Files over 5MB yield 400 Bad Request.');
    assert(oversizedRes.body.success === false, 'Response success flag is false.');
    assert(oversizedRes.body.message.includes('exceed the maximum allowed size limit of 5MB'), 'Standardized error alerts client about size constraints.');

    // ------------------------------------------------------------------
    // TEST 4: Backward Compatibility - raw JSON payload (application/json)
    // ------------------------------------------------------------------
    console.log('\n[TEST 4] Filing a complaint with raw JSON coordinates and pre-uploaded URLs...');
    
    const jsonRes = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .set('Content-Type', 'application/json')
      .send({
        title: 'Broken Drainage Cover',
        description: 'Open sewer hole on the pedestrian walkway.',
        category: 'drainage',
        priority: 'high',
        longitude: 77.5946, // Float numbers in raw JSON
        latitude: 12.9716,
        address: 'Pedestrian Walkway Sector 4',
        images: ['https://res.cloudinary.com/custom/image/upload/v1/custom_pothole.jpg']
      });

    assert(jsonRes.statusCode === 201, 'JSON route successfully creates complaint (201 Created).');
    assert(jsonRes.body.success === true, 'Response success is true.');
    assert(jsonRes.body.data.images[0] === 'https://res.cloudinary.com/custom/image/upload/v1/custom_pothole.jpg', 'Direct JSON string image list is saved.');

    console.log('\n------------------------------------------------------------');
    if (errorsCount === 0) {
      console.log('🎉 ALL CLOUDINARY UPLOAD SYSTEM TESTS COMPLETED SUCCESSFULLY WITH ZERO ERRORS.');
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
