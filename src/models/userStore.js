import { v4 as uuidv4 } from 'uuid';

class UserStore {
  constructor() {
    this.users = new Map();
    this.emailIndex = new Map();
    this.refreshTokens = new Map();
  }

  async createUser({ email, passwordHash, roles = ['user'] }) {
    const id = uuidv4();
    const user = { id, email, passwordHash, roles, createdAt: Date.now(), failedAttempts: 0, lockUntil: null };
    this.users.set(id, user);
    this.emailIndex.set(email, id);
    return user;
  }

  async getUserByEmail(email) {
    const id = this.emailIndex.get(email);
    return id ? this.users.get(id) : null;
  }

  async getUserById(id) {
    return this.users.get(id) || null;
  }

  async storeRefreshToken(tokenId, userId, expiresAt) {
    this.refreshTokens.set(tokenId, { userId, expiresAt });
  }

  async revokeRefreshToken(tokenId) {
    this.refreshTokens.delete(tokenId);
  }

  async validateRefreshToken(tokenId, userId) {
    const rec = this.refreshTokens.get(tokenId);
    if (!rec) return false;
    if (rec.userId !== userId) return false;
    if (rec.expiresAt < Date.now()) {
      this.refreshTokens.delete(tokenId);
      return false;
    }
    return true;
  }

  async incrementFailedAttempts(userId, maxAttempts, lockDurationMs) {
    const user = this.users.get(userId);
    if (!user) return;
    user.failedAttempts = (user.failedAttempts || 0) + 1;
    if (user.failedAttempts >= maxAttempts) {
      user.lockUntil = Date.now() + lockDurationMs;
      user.failedAttempts = 0;
    }
    this.users.set(userId, user);
  }

  async resetFailedAttempts(userId) {
    const user = this.users.get(userId);
    if (!user) return;
    user.failedAttempts = 0;
    user.lockUntil = null;
    this.users.set(userId, user);
  }

  async isLocked(userId) {
    const user = this.users.get(userId);
    if (!user) return false;
    if (!user.lockUntil) return false;
    if (user.lockUntil < Date.now()) {
      user.lockUntil = null;
      this.users.set(userId, user);
      return false;
    }
    return true;
  }
}

export const userStore = new UserStore();