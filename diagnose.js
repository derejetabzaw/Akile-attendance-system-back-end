/**
 * diagnose.js
 * Connects to the production DB and prints a detailed breakdown of
 * attendance records to diagnose why payroll shows 0 hours.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const PROD_DB_URL =
    process.env.PROD_DB_URL ||
    'mongodb+srv://attendance_db_user:OaMupcIYoZlxNi3P@attendance.x4qpr6m.mongodb.net/akille_db?appName=attendance';

const AttendanceSchema = new mongoose.Schema({}, { strict: false });
const UserSchema       = new mongoose.Schema({}, { strict: false });

const A = mongoose.model('attendance', AttendanceSchema);
const U = mongoose.model('user',       UserSchema);

(async () => {
    await mongoose.connect(PROD_DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected.\n');

    // ── 1. Total records ────────────────────────────────────────────────────
    const total = await A.countDocuments();
    console.log(`Total attendance records: ${total}`);

    // ── 2. Approval breakdown ────────────────────────────────────────────────
    const approved   = await A.countDocuments({ isApproved: true });
    const unapproved = await A.countDocuments({ isApproved: false });
    const noApproval = await A.countDocuments({ isApproved: { $exists: false } });
    console.log(`  isApproved=true    : ${approved}`);
    console.log(`  isApproved=false   : ${unapproved}`);
    console.log(`  isApproved missing : ${noApproval}`);

    // ── 3. Sample 10 records — show raw field values ─────────────────────────
    console.log('\nSample records (raw):');
    const samples = await A.find().limit(10).lean();
    samples.forEach((r, i) => {
        console.log(`  [${i+1}] date="${r.date}" in="${r.checkInTime}" out="${r.checkOutTime}" workedHours=${r.workedHours} OT=${r.overtime} approved=${r.isApproved}`);
    });

    // ── 4. Date format breakdown ─────────────────────────────────────────────
    const isoFormat   = await A.countDocuments({ date: /^\d{4}-\d{2}-\d{2}$/ });
    const otherFormat = total - isoFormat;
    console.log(`\nDate format YYYY-MM-DD : ${isoFormat}`);
    console.log(`Date format other      : ${otherFormat}`);
    if (otherFormat > 0) {
        const otherSamples = await A.find({ date: { $not: /^\d{4}-\d{2}-\d{2}$/ } }).limit(5).lean();
        console.log('  Sample non-ISO dates:');
        otherSamples.forEach(r => console.log(`    "${r.date}"`));
    }

    // ── 5. May 2026 records specifically ─────────────────────────────────────
    console.log('\nMay 2026 records:');
    const mayIso    = await A.countDocuments({ date: { $gte: '2026-05-01', $lte: '2026-05-31' } });
    const mayMiId   = await A.countDocuments({ monthIdentifier: '2026-05' });
    const mayApproved = await A.countDocuments({ date: { $gte: '2026-05-01', $lte: '2026-05-31' }, isApproved: true });
    console.log(`  Via date range (YYYY-MM-DD) : ${mayIso}`);
    console.log(`  Via monthIdentifier=2026-05 : ${mayMiId}`);
    console.log(`  Approved in May             : ${mayApproved}`);

    // ── 6. workedHours breakdown across ALL records ──────────────────────────
    const zeroHours    = await A.countDocuments({ workedHours: 0 });
    const nullHours    = await A.countDocuments({ workedHours: null });
    const missingHours = await A.countDocuments({ workedHours: { $exists: false } });
    const hasHours     = await A.countDocuments({ workedHours: { $gt: 0 } });
    console.log('\nworkedHours breakdown (all records):');
    console.log(`  > 0    : ${hasHours}`);
    console.log(`  = 0    : ${zeroHours}`);
    console.log(`  null   : ${nullHours}`);
    console.log(`  missing: ${missingHours}`);

    // ── 7. Users count ───────────────────────────────────────────────────────
    const users = await U.find({}, 'name lastName staffId isApproved salary').lean();
    console.log(`\nApproved users (${users.filter(u => u.isApproved).length} of ${users.length} total):`);
    users.forEach(u => {
        console.log(`  ${(u.name+' '+(u.lastName||'')).padEnd(25)} staffId=${u.staffId}  salary=${u.salary}  approved=${u.isApproved}`);
    });

    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
