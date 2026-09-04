import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/sendEmail.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, profilePic } = req.body;

    const userExists = await User.findOne({ email: email.toLowerCase() });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      profilePic: profilePic || '',
      isEmailVerified: false,
    });

    if (user) {
      // Generate email verification token (24 hours expiry)
      const verificationToken = crypto.randomBytes(32).toString('hex');
      user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
      user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
      await user.save();

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const verifyUrl = `${frontendUrl}/verify-email/${verificationToken}`;

      // Asynchronously trigger verification email
      sendVerificationEmail({
        email: user.email,
        name: user.name,
        verifyUrl,
      }).catch((err) => console.error('[VERIFICATION EMAIL ERROR]', err));

      const token = generateToken(res, user._id);
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
        isEmailVerified: user.isEmailVerified,
        token,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email ? email.toLowerCase() : '' });

    if (user && !user.password && user.googleId) {
      return res.status(400).json({
        message: 'This account was created with Google Sign-In. Please sign in with Google.',
      });
    }

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(res, user._id);
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
        isEmailVerified: user.isEmailVerified,
        token,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate with Google OAuth ID Token
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential token is required' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({
        message: 'Google Client ID is not configured on the server. Please set GOOGLE_CLIENT_ID in Server/.env',
      });
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Invalid Google token payload' });
    }

    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // Existing user: Link Google ID if not linked & auto-verify email
      let updated = false;
      if (!user.googleId) {
        user.googleId = googleId;
        updated = true;
      }
      if (!user.profilePic && picture) {
        user.profilePic = picture;
        updated = true;
      }
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    } else {
      // New user registration via Google (emails verified by Google)
      user = await User.create({
        name: name || 'Google User',
        email: email.toLowerCase(),
        googleId,
        authProvider: 'google',
        profilePic: picture || '',
        isEmailVerified: true,
      });
    }

    const token = generateToken(res, user._id);

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic,
      isEmailVerified: user.isEmailVerified,
      token,
    });
  } catch (error) {
    console.error('[GOOGLE AUTH ERROR]', error);
    res.status(401).json({ message: error.message || 'Google authentication failed' });
  }
};

// @desc    Forgot Password - Request reset link
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Generic message to prevent email enumeration
      return res.status(200).json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    if (!user.password && user.googleId) {
      return res.status(400).json({
        message: 'This account was created with Google Sign-In. Please sign in with Google.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetUrl,
    });

    res.status(200).json({
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('[FORGOT PASSWORD ERROR]', error);
    res.status(500).json({ message: error.message || 'Error processing password reset' });
  }
};

// @desc    Reset Password with token
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: 'Password reset link is invalid or has expired. Please request a new one.',
      });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    const jwtToken = generateToken(res, user._id);

    res.status(200).json({
      message: 'Password has been reset successfully! You are now logged in.',
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic,
      isEmailVerified: user.isEmailVerified,
      token: jwtToken,
    });
  } catch (error) {
    console.error('[RESET PASSWORD ERROR]', error);
    res.status(500).json({ message: error.message || 'Error resetting password' });
  }
};

// @desc    Verify email address with token
// @route   POST /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: 'Verification link is invalid or has expired. Please request a new verification email.',
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.status(200).json({
      message: 'Email verified successfully! Your account is now fully verified.',
      isEmailVerified: true,
    });
  } catch (error) {
    console.error('[VERIFY EMAIL ERROR]', error);
    res.status(500).json({ message: error.message || 'Error verifying email' });
  }
};

// @desc    Resend email verification link
// @route   POST /api/auth/resend-verification
// @access  Public
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    let user;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
    } else if (req.user?._id) {
      user = await User.findById(req.user._id);
    }

    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Your email address is already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${frontendUrl}/verify-email/${verificationToken}`;

    await sendVerificationEmail({
      email: user.email,
      name: user.name,
      verifyUrl,
    });

    res.status(200).json({
      message: 'Verification email sent! Please check your inbox.',
    });
  } catch (error) {
    console.error('[RESEND VERIFICATION ERROR]', error);
    res.status(500).json({ message: error.message || 'Error sending verification email' });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
        isEmailVerified: user.isEmailVerified,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.profilePic = req.body.profilePic || user.profilePic;

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();
      const token = generateToken(res, updatedUser._id);

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        profilePic: updatedUser.profilePic,
        isEmailVerified: updatedUser.isEmailVerified,
        token,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  googleAuth,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
};
