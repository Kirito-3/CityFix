import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// Helper function to sign JSON Web Tokens
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Register a new User account.
 * Route: POST /api/v1/auth/signup
 * Access: Public
 */
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  // Verify if a user with that email already exists
  const existingUserByEmail = await User.findOne({ email });
  if (existingUserByEmail) {
    throw new ApiError(400, 'Registration failed: A user with this email address already exists.');
  }

  // Verify if a user with that phone number already exists
  if (phone) {
    const existingUserByPhone = await User.findOne({ phone });
    if (existingUserByPhone) {
      throw new ApiError(400, 'Registration failed: A user with this phone number already exists.');
    }
  }

  // Create the new user record in MongoDB
  const newUser = await User.create({
    name,
    email,
    password,
    role,
    phone,
  });

  if (!newUser) {
    throw new ApiError(500, 'Failed to create user. Please try again.');
  }

  // Generate JWT access token
  const token = generateToken(newUser._id);

  // Exclude password from output
  const userResponse = {
    _id: newUser._id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    phone: newUser.phone,
    createdAt: newUser.createdAt,
  };

  res
    .status(201)
    .json(new ApiResponse(201, { user: userResponse, token }, 'User registered successfully.'));
});

/**
 * Authenticate User credentials and return token.
 * Route: POST /api/v1/auth/login
 * Access: Public
 */
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Retrieve user including password field (which is select: false by default)
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Authentication failed: Invalid email or password.');
  }

  // Confirm password match
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Authentication failed: Invalid email or password.');
  }

  // Sign token
  const token = generateToken(user._id);

  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    profilePicture: user.profilePicture,
  };

  res
    .status(200)
    .json(new ApiResponse(200, { user: userResponse, token }, 'Authentication successful.'));
});

/**
 * Retrieve current authenticated user profile context.
 * Route: GET /api/v1/auth/me
 * Access: Private
 */
export const getMe = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(404, 'User context not found.');
  }
  
  res.status(200).json(new ApiResponse(200, req.user, 'Current user context retrieved.'));
});

export default { registerUser, loginUser, getMe };
