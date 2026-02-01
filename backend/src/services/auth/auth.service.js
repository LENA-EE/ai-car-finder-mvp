const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../config/jwt');
const usersRepo = require('../../repositories/users.repository');

async function login(email, password) {
  const user = await usersRepo.findUserByEmail(email);

  if (!user) {
    return { error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);

  if (!validPassword) {
    return { error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
  }

  await usersRepo.updateLastLogin(user.id);

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );

  return {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    },
    expiresIn: jwtConfig.expiresIn
  };
}

module.exports = { login };
