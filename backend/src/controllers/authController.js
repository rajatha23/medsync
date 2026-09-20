const authService = require('../services/authService');

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, hospital_id, phone } = req.body;
    const result = await authService.registerUser({ name, email, password, role, hospital_id, phone });
    
    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });
    
    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    
    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
};

module.exports = {
  register,
  login,
  getCurrentUser,
  logout
};
