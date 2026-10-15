import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('RegionGuard REST API & Validation', () => {
  it('GET /api/health returns 200 and valid status info', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.problemStatement).toBe('PS 23');
  });

  it('GET /api/simulation/state returns valid cluster state', async () => {
    const res = await request(app).get('/api/simulation/state');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('regions');
    expect(res.body).toHaveProperty('quorum');
    expect(res.body).toHaveProperty('splitBrainGuard');
    expect(res.body).toHaveProperty('invariants');
  });

  it('GET /api/simulation/scenarios returns all 10 scenarios', async () => {
    const res = await request(app).get('/api/simulation/scenarios');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(10);
  });

  it('POST /api/simulation/write rejects invalid request body via Zod', async () => {
    const res = await request(app).post('/api/simulation/write').send({
      originRegion: 'invalid-region', // invalid enum
      description: '',
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('details');
  });

  it('POST /api/simulation/step steps the simulation', async () => {
    const res = await request(app).post('/api/simulation/step');
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('stepped');
  });

  it('GET /api/simulation/report returns simulation report JSON', async () => {
    const res = await request(app).get('/api/simulation/report');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('invariantsSummary');
    expect(res.body).toHaveProperty('singleWriterInvariantSatisfied');
  });

  it('GET /api/simulation/report/html returns formatted HTML report', async () => {
    const res = await request(app).get('/api/simulation/report/html');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('RegionGuard Virtual Lab Report');
  });
});
