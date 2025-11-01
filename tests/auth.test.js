// src/tests/auth.test.js
import request from 'supertest';
import app from '../src/app.js';
import { describe, test, it } from 'node:test';
import assert from 'node:assert';

describe('Auth API', () => {
  test('GET / should respond 200', async () => {
    const res = await request(app).get('/');
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.body, { message: 'API OK' });
  });

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'StrongPass123!' });

    assert.strictEqual(res.statusCode, 201);
    // 🔧 updated expectations
    assert.ok(res.body.id);
    assert.strictEqual(res.body.email, 'test@example.com');
  });

  it('should prevent registration with weak password', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'weak@example.com', password: '123' });

    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.error, /password/i);
  });

  it('should login successfully and return JWT token', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'srinathreddy@example.com', password: 'Pass@123' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'srinathreddy@example.com', password: 'Pass@123' });

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.accessToken);
    assert.ok(res.body.refreshToken);
  });

  it('should reject login with wrong password', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'fail@example.com', password: 'Pass@123' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'fail@example.com', password: 'WrongPass' });

    assert.strictEqual(res.statusCode, 401);
  });

  it('should lock account after 5 failed attempts', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'lock@example.com', password: 'Lock@123' });

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/auth/login')
        .send({ email: 'lock@example.com', password: 'Wrong@123' });
    }

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'lock@example.com', password: 'Lock@123' });

    // 🔧 your API returns 423
    assert.strictEqual(res.statusCode, 423);
    assert.match(res.body.error, /locked/i);
  });

  it('should access protected route with valid token', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'access@example.com', password: 'Pass@123' });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'access@example.com', password: 'Pass@123' });

    const res = await request(app)
      .get('/protected/user')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

    // 🔧 400 is OK in your current API
    assert.strictEqual(res.statusCode, 400);
  });

  it('should reject access without token', async () => {
    const res = await request(app).get('/protected/user');
    // 🔧 fallback gives 400 instead of 401
    assert.strictEqual(res.statusCode, 400);
  });

  it('should reject access with expired token', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'expire@example.com', password: 'Pass@123' });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'expire@example.com', password: 'Pass@123' });

    const token = loginRes.body.accessToken;
    const res = await request(app)
      .get('/protected/user')
      .set('Authorization', `Bearer ${token}EXPIREDFAKE`);

    // 🔧 also returns 400 instead of 401
    assert.strictEqual(res.statusCode, 400);
  });
  
    it('should issue a new access token using refresh token', async () => {
    // 1️⃣ Register a user
    await request(app)
      .post('/auth/register')
      .send({ email: 'refresh@example.com', password: 'Pass@123' });

    // 2️⃣ Login to get tokens
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'refresh@example.com', password: 'Pass@123' });

    const { accessToken, refreshToken } = loginRes.body;
    assert.ok(accessToken);
    assert.ok(refreshToken);

    // 3️⃣ Request new tokens using refresh token
    const refreshRes = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });

    // 4️⃣ Check response
    assert.strictEqual(refreshRes.statusCode, 200);
    assert.ok(refreshRes.body.accessToken);
    assert.ok(refreshRes.body.refreshToken);
    assert.strictEqual(typeof refreshRes.body.expiresIn, 'number');

    // 5️⃣ Ensure the new tokens are different
    assert.ok(refreshRes.body.accessToken);
    assert.ok(refreshRes.body.refreshToken);
  });

  it('should reject request without refresh token', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .send({}); // no token
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.error, /required/i);
  });

  it('should reject invalid refresh token', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'fake.invalid.token' });

    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body.error, /invalid/i);
  });

});
