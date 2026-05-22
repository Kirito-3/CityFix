import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';

// Setup environment variables in case they aren't loaded
process.env.JWT_SECRET = 'super_secret_jwt_sign_key_for_cityfix_backend_2026';
process.env.JWT_EXPIRES_IN = '7d';
process.env.BCRYPT_SALT_ROUNDS = '12';

console.log('------------------------------------------------------------');
console.log('🧪 CityFix Authentication Module - Programmatic Tests');
console.log('------------------------------------------------------------');

// 1. Initialize local in-memory mock database state
const mockUsers = [];

// Helper to wrap raw mock user document with comparePassword method
const wrapMockUser = (rawUser) => {
  if (!rawUser) return null;
  return {
    ...rawUser,
    comparePassword: async function (enteredPassword) {
      // In tests, allow plain password comparison or check hash
      return enteredPassword === rawUser.password || await bcrypt.compare(enteredPassword, rawUser.password);
    }
  };
};

// 2. Overwrite Mongoose Model operations with in-memory array mocks
User.findOne = (query) => {
  const found = mockUsers.find((user) => {
    if (query.email) return user.email === query.email;
    if (query.phone) return user.phone === query.phone;
    return false;
  });

  const queryChain = {
    select: (fields) => Promise.resolve(wrapMockUser(found)),
    then: (resolve) => resolve(wrapMockUser(found)),
  };

  return queryChain;
};

User.findById = (id) => {
  const found = mockUsers.find((user) => user._id.toString() === id.toString());

  const queryChain = {
    select: (fields) => Promise.resolve(wrapMockUser(found)),
    then: (resolve) => resolve(wrapMockUser(found)),
  };

  return queryChain;
};

User.create = async (userData) => {
  // Simulate password encryption (bcrypt hook logic)
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(userData.password, salt);

  const newUser = {
    _id: new mongoose.Types.ObjectId(),
    name: userData.name,
    email: userData.email,
    password: hashedPassword,
    role: userData.role || 'citizen',
    phone: userData.phone || '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  mockUsers.push(newUser);
  return Promise.resolve(newUser);
};

// 3. Define Automated Test Assertions Suite
const runTests = async () => {
  let testToken = '';
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
    // TEST 1: Citizen Sign Up successfully
    // ------------------------------------------------------------------
    console.log('\n[TEST 1] Creating a new citizen profile...');
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        name: 'James Bond',
        email: 'james.bond@mi6.gov',
        password: 'secretPassword007',
        role: 'citizen',
        phone: '1234567890',
      });

    assert(signupRes.statusCode === 201, 'Signup returns status code 201.');
    assert(signupRes.body.success === true, 'Response payload success is true.');
    assert(signupRes.body.data.token !== undefined, 'Response yields JWT sign token.');
    assert(signupRes.body.data.user.email === 'james.bond@mi6.gov', 'User payload matches email.');
    assert(signupRes.body.data.user.password === undefined, 'Security check: password field is omitted.');

    testToken = signupRes.body.data.token;

    // ------------------------------------------------------------------
    // TEST 2: Schema validation reject (malformed email / short pass)
    // ------------------------------------------------------------------
    console.log('\n[TEST 2] Verifying Zod schema validation gate...');
    const badSignup = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        name: 'J',
        email: 'bad-email-format',
        password: '123',
      });

    assert(badSignup.statusCode === 400, 'Zod rejects request with status code 400.');
    assert(badSignup.body.success === false, 'Response success is false.');
    assert(badSignup.body.errors !== undefined, 'Zod error message reasons lists populated.');

    // ------------------------------------------------------------------
    // TEST 3: Duplicate Email Check rejection
    // ------------------------------------------------------------------
    console.log('\n[TEST 3] Asserting duplicate email registration checks...');
    const dupEmailRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        name: 'Imposter Agent',
        email: 'james.bond@mi6.gov',
        password: 'anotherPassword',
        phone: '9876543210',
      });

    assert(dupEmailRes.statusCode === 400, 'Duplicate email registration returns 400.');
    assert(
      dupEmailRes.body.message.includes('A user with this email address already exists'),
      'Semantic duplicate email error message returned.'
    );

    // ------------------------------------------------------------------
    // TEST 4: Duplicate Phone Check rejection
    // ------------------------------------------------------------------
    console.log('\n[TEST 4] Asserting duplicate phone registration checks...');
    const dupPhoneRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        name: 'Duplicate Phone Agent',
        email: 'agent2@mi6.gov',
        password: 'anotherPassword',
        phone: '1234567890', // matches james bond's phone number
      });

    assert(dupPhoneRes.statusCode === 400, 'Duplicate phone registration returns 400.');
    assert(
      dupPhoneRes.body.message.includes('A user with this phone number already exists'),
      'Semantic duplicate phone error message returned.'
    );

    // ------------------------------------------------------------------
    // TEST 5: User Login successfully
    // ------------------------------------------------------------------
    console.log('\n[TEST 5] Authenticating registered user login...');
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'james.bond@mi6.gov',
        password: 'secretPassword007',
      });

    assert(loginRes.statusCode === 200, 'Successful credentials return status code 200.');
    assert(loginRes.body.data.token !== undefined, 'Login issues active JWT token.');

    // ------------------------------------------------------------------
    // TEST 6: Bad Credentials Login rejection
    // ------------------------------------------------------------------
    console.log('\n[TEST 6] Logging in with invalid password...');
    const badLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'james.bond@mi6.gov',
        password: 'wrongPassword',
      });

    assert(badLoginRes.statusCode === 401, 'Bad credentials login returns 401.');
    assert(
      badLoginRes.body.message.includes('Invalid email or password'),
      'Semantic invalid credentials message returned.'
    );

    // ------------------------------------------------------------------
    // TEST 7: Access /me Profile with token
    // ------------------------------------------------------------------
    console.log('\n[TEST 7] Accessing protected Profile route with active Bearer Token...');
    const profileRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${testToken}`);

    assert(profileRes.statusCode === 200, 'Profile returns status code 200.');
    assert(profileRes.body.data.name === 'James Bond', 'Returned user profile context is accurate.');

    // ------------------------------------------------------------------
    // TEST 8: Rejects Profile route with invalid/missing token
    // ------------------------------------------------------------------
    console.log('\n[TEST 8] Accessing protected route with corrupt or missing token...');
    const badProfileRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer bad_token_signature`);

    assert(badProfileRes.statusCode === 401, 'Invalid signature returns 401.');
    assert(
      badProfileRes.body.message.includes('Invalid or corrupt token'),
      'Returned invalid token semantic error.'
    );

    const emptyProfileRes = await request(app).get('/api/v1/auth/me');
    assert(emptyProfileRes.statusCode === 401, 'Missing authorization token header returns 401.');
    assert(
      emptyProfileRes.body.message.includes('Authentication token required'),
      'Returned missing token semantic error.'
    );

    console.log('\n------------------------------------------------------------');
    if (errorsCount === 0) {
      console.log('🎉 ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY WITH ZERO ERRORS.');
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
