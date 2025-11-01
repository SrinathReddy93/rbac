import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { registerSchema, loginSchema } from '../utils/validators.js';
import { userStore } from '../models/userStore.js';
import { config } from '../configs/config.js';
import logger from '../utils/logger.js';


const router = express.Router();
const SALT_ROUNDS = process.env.SALT_ROUNDS ? parseInt(process.env.SALT_ROUNDS) :  10;
const LOCK_MAX_ATTEMPTS = process.env.LOCK_MAX_ATTEMPTS ? parseInt(process.env.LOCK_MAX_ATTEMPTS) : 5;
const LOCK_DURATION_MS = process.env.LOCK_DURATION_MS ? parseInt(process.env.LOCK_DURATION_MS) : 15 * 60 * 1000;
function signAccess(user) {
  return jwt.sign({ sub: user.id, roles: user.roles }, config.jwt.accessSecret, { expiresIn: config.jwt.accessExpiry });
}

function signRefresh(user, tokenId) {
  return jwt.sign({ sub: user.id, tokenId }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiry });
}

router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const existing = await userStore.getUserByEmail(value.email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(value.password, SALT_ROUNDS);
    const user = await userStore.createUser({ email: value.email.toLowerCase(), passwordHash, roles: value.roles || ['user'] });
    res.status(201).json({ id: user.id, email: user.email });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const user = await userStore.getUserByEmail(value.email.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (await userStore.isLocked(user.id)) return res.status(423).json({ error: 'Account locked. Try again later.' });

    const ok = await bcrypt.compare(value.password, user.passwordHash);
    if (!ok) {
      await userStore.incrementFailedAttempts(user.id, LOCK_MAX_ATTEMPTS, LOCK_DURATION_MS);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await userStore.resetFailedAttempts(user.id);

    const accessToken = signAccess(user);
    const tokenId = uuidv4();
    const refreshToken = signRefresh(user, tokenId);
    const decoded = jwt.decode(refreshToken);
    await userStore.storeRefreshToken(tokenId, user.id, decoded.exp * 1000);

    res.json({ accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 15 * 60 });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const { sub: userId, tokenId } = payload;
    const valid = await userStore.validateRefreshToken(tokenId, userId);
    if (!valid) return res.status(401).json({ error: 'Refresh token revoked or expired' });

    const user = await userStore.getUserById(userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

    await userStore.revokeRefreshToken(tokenId);
    const newTokenId = uuidv4();
    const newRefreshToken = signRefresh(user, newTokenId);
    const decoded = jwt.decode(newRefreshToken);
    await userStore.storeRefreshToken(newTokenId, user.id, decoded.exp * 1000);

    const accessToken = signAccess(user);
    res.json({ accessToken, refreshToken: newRefreshToken, expiresIn: 15 * 60 });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch {
      return res.json({ ok: true });
    }

    await userStore.revokeRefreshToken(payload.tokenId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;