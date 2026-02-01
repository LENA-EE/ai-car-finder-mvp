const authService = require('../services/auth/auth.service');
const { logAdminAction } = require('../repositories/audit.repository');

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'INVALID_REQUEST', details: 'Email and password required' });
  }

  try {
    const result = await authService.login(email, password);

    if (result.error) {
      return res.status(401).json({ error: result.error, details: result.message });
    }

    await logAdminAction(result.user.id, result.user.email, 'login', { success: true }, req);

    res.json({
      success: true,
      token: result.token,
      user: result.user,
      expires_in: result.expiresIn
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', details: err.message });
  }
}

function me(req, res) {
  res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role
  });
}

module.exports = { login, me };
