import express from 'express';
import request from 'supertest';
import app from '../src/app';

describe('Health Check API Endpoint', () => {
  it('GET /health should return 200 OK with status ok', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('Internship Management System Backend');
  });
});
