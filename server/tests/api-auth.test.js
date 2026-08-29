import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { requireAuth } from '../src/middleware/auth.js';

describe('TooPrep - Server Auth Middleware & Security Integration Tests', () => {

  let app;
  let server;
  let baseUrl;

  before(async () => {
    app = express();
    app.use(express.json());

    // Public health check
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Protected dummy route
    app.get('/api/protected', requireAuth, (req, res) => {
      res.json({ message: 'Success', user: req.user });
    });

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('GET /api/health should be publicly accessible and return status ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.timestamp);
  });

  it('GET /api/protected without Authorization header should return 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/protected`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, 'Missing or invalid Authorization header');
  });

  it('GET /api/protected with invalid Bearer token should return 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/protected`, {
      headers: { Authorization: 'Bearer invalid_mock_token_12345' }
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, 'Invalid or expired token');
  });

});
