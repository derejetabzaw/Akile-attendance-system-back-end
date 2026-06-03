/**
 * test_render.js
 * Tests the live Render backend payroll endpoint.
 * Usage: node test_render.js <staffId> <password>
 * Example: node test_render.js admin TestTest
 */
require('dotenv').config();
const https = require('https');

const RENDER_BASE = 'akille-backend-server.onrender.com';
const staffId  = process.argv[2] || 'AKL816863';
const password = process.argv[3] || 'TestTest';

function request(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: RENDER_BASE,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'authorization': `Bearer ${token}` } : {}),
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
            }
        };
        const req = https.request(opts, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
                catch (e) { resolve({ status: res.statusCode, body: d }); }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

(async () => {
    console.log(`Testing Render backend: https://${RENDER_BASE}\n`);

    // Step 1: Login
    console.log(`1. Logging in as staffId="${staffId}" password="${password}" …`);
    const login = await request('POST', '/api/v1/auth/login', { staffId, password });
    console.log(`   HTTP ${login.status}:`, JSON.stringify(login.body).substring(0, 200));

    const token = login.body.accessToken || login.body.token;
    if (!token) {
        console.log('\n❌ Login failed — cannot proceed. Check staffId/password.');
        return;
    }
    console.log(`   ✅ Got token.\n`);

    // Step 2: Payroll for May 2026
    console.log('2. Fetching payroll for May 2026 …');
    const payroll = await request('GET', '/api/v1/payroll/calculate?startDate=2026-05-01&endDate=2026-05-31', null, token);
    console.log(`   HTTP ${payroll.status}`);
    if (payroll.body.payroll) {
        payroll.body.payroll.forEach(p => {
            console.log(`   ${p.name.padEnd(25)} | workHrs=${p.totalWorkHours}  OT1=${p.totalOT1}  OT2=${p.totalOT2}  net=${p.totalNetPay}  records=${p.recordCount}`);
        });
    } else {
        console.log('   Response:', JSON.stringify(payroll.body).substring(0, 300));
    }
})().catch(console.error);
