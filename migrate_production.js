/**
 * migrate_production.js
 * -----------------------------------------------------------------------
 * Run once against the production MongoDB Atlas database to:
 *   1. Backfill `monthIdentifier` on every attendance record that is missing it.
 *   2. Approve ALL attendance records (set isApproved=true for existing data).
 *   3. Recalculate & save `workedHours`, `overtime`, `overtimeTwo` for every
 *      record where those fields are 0 (or missing) but both
 *      checkInTime and checkOutTime exist.
 *   4. Seed default Settings (ot1Rate, ot2Rate) if not already present.
 *
 * Usage:
 *   node migrate_production.js
 * -----------------------------------------------------------------------
 */

require('dotenv').config();
const mongoose = require('mongoose');
const moment   = require('moment');
const { calculateOvertime } = require('./utilities/attendanceUtils');

const PROD_DB_URL =
    process.env.PROD_DB_URL ||
    'mongodb+srv://attendance_db_user:OaMupcIYoZlxNi3P@attendance.x4qpr6m.mongodb.net/akille_db?appName=attendance';

// Bare schemas — no middleware hooks
const AttendanceSchema = new mongoose.Schema({
    user:            mongoose.Schema.Types.ObjectId,
    date:            String,
    checkInTime:     String,
    checkOutTime:    String,
    numberOfCheckIn: Number,
    workedHours:     Number,
    overtime:        Number,
    overtimeTwo:     Number,
    isApproved:      Boolean,
    monthIdentifier: String,
});

const SettingsSchema = new mongoose.Schema({
    key:   { type: String, unique: true },
    value: mongoose.Schema.Types.Mixed,
    label: String,
});

const AM = mongoose.model('attendance', AttendanceSchema);
const SM = mongoose.model('settings',   SettingsSchema);

function deriveMonthIdentifier(dateStr) {
    const parsed = moment(dateStr, ['YYYY-MM-DD','dddd, DD-MM-YYYY','DD,MM,YYYY','DD-MM-YYYY']);
    return parsed.isValid() ? parsed.format('YYYY-MM') : dateStr.substring(0, 7);
}

function normalizeDate(dateStr) {
    const parsed = moment(dateStr, ['YYYY-MM-DD','dddd, DD-MM-YYYY','DD,MM,YYYY','DD-MM-YYYY']);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
}

(async () => {
    try {
        console.log('⏳  Connecting to production database …');
        await mongoose.connect(PROD_DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('✅  Connected.\n');

        // ── 1. Backfill monthIdentifier ────────────────────────────────────
        console.log('── STEP 1: Backfill monthIdentifier ──────────────────────────');
        const missingMI = await AM.find({
            $or: [
                { monthIdentifier: { $exists: false } },
                { monthIdentifier: null },
                { monthIdentifier: '' },
            ],
        }).lean();
        console.log(`   Found ${missingMI.length} records missing monthIdentifier.`);
        let monthFixed = 0;
        for (const rec of missingMI) {
            const mi = deriveMonthIdentifier(rec.date || '');
            if (mi) {
                await AM.updateOne({ _id: rec._id }, { $set: { monthIdentifier: mi } });
                monthFixed++;
            }
        }
        console.log(`   ✅  Fixed monthIdentifier on ${monthFixed} records.\n`);

        // ── 2. Approve ALL existing records ────────────────────────────────
        console.log('── STEP 2: Approve ALL existing attendance records ────────────');
        const unapprovedCount = await AM.countDocuments({
            $or: [{ isApproved: false }, { isApproved: { $exists: false } }]
        });
        console.log(`   Found ${unapprovedCount} unapproved records.`);
        const approveResult = await AM.updateMany(
            { $or: [{ isApproved: false }, { isApproved: { $exists: false } }] },
            { $set: { isApproved: true } }
        );
        console.log(`   ✅  Approved ${approveResult.modifiedCount} records.\n`);

        // ── 3. Recalculate hours for records with 0/missing hours ──────────
        console.log('── STEP 3: Recalculate workedHours / overtime ────────────────');
        const zeroHourRecords = await AM.find({
            checkInTime:  { $exists: true, $ne: '' },
            checkOutTime: { $exists: true, $ne: '' },
            $or: [
                { workedHours: 0 },
                { workedHours: { $exists: false } },
                { workedHours: null },
            ],
        }).lean();
        console.log(`   Found ${zeroHourRecords.length} checked-out records with 0/missing hours.`);

        // Group by user+date for correct cumulative OT calculation
        const byUserDate = {};
        for (const r of zeroHourRecords) {
            const key = `${r.user}_${r.date}`;
            if (!byUserDate[key]) byUserDate[key] = [];
            byUserDate[key].push(r);
        }

        let hoursFixed = 0;
        for (const key of Object.keys(byUserDate)) {
            const dayRecs = byUserDate[key].sort((a, b) =>
                (a.checkInTime || '').localeCompare(b.checkInTime || ''));
            let dailyPrev = 0;
            for (const rec of dayRecs) {
                const checkIn  = moment(rec.checkInTime,  'HH:mm:ss');
                const checkOut = moment(rec.checkOutTime, 'HH:mm:ss');
                let diff = checkOut.diff(checkIn, 'hours', true);
                if (diff < 0) diff += 24;
                if (diff <= 0) {
                    dailyPrev += (rec.workedHours || 0) + (rec.overtime || 0) + (rec.overtimeTwo || 0);
                    continue;
                }
                const dateNorm = normalizeDate(rec.date) || rec.date;
                const otData   = calculateOvertime(diff, dateNorm, dailyPrev);
                await AM.updateOne(
                    { _id: rec._id },
                    { $set: {
                        workedHours: otData.workHours,
                        overtime:    otData.ot1,
                        overtimeTwo: otData.ot2,
                    }}
                );
                dailyPrev += diff;
                hoursFixed++;
                console.log(`   ✔  ${rec.date} in=${rec.checkInTime} out=${rec.checkOutTime}  →  work=${otData.workHours}h  ot1=${otData.ot1}h`);
            }
        }
        console.log(`   ✅  Recalculated hours on ${hoursFixed} records.\n`);

        // ── 4. Seed default Settings ───────────────────────────────────────
        console.log('── STEP 4: Seed default Settings ─────────────────────────────');
        const defaults = [
            { key: 'ot1Rate',       value: 1.5, label: 'OT1 Rate (1.5x)' },
            { key: 'ot2Rate',       value: 2.0, label: 'OT2 Rate (2x)'   },
            { key: 'checkInRadius', value: 200, label: 'Check-in Radius (m)' },
            { key: 'standardHours', value: 160, label: 'Standard Monthly Hours' },
        ];
        for (const d of defaults) {
            const ex = await SM.findOne({ key: d.key });
            if (!ex) {
                await SM.create(d);
                console.log(`   ➕  Created: ${d.key} = ${d.value}`);
            } else {
                console.log(`   ✔   Exists:  ${d.key} = ${ex.value}`);
            }
        }
        console.log('   ✅  Settings seeded.\n');

        // ── Final summary ──────────────────────────────────────────────────
        const finalApproved = await AM.countDocuments({ isApproved: true });
        const finalWithHours = await AM.countDocuments({ workedHours: { $gt: 0 } });
        console.log(`── Final State ───────────────────────────────────────────────`);
        console.log(`   Total records    : ${await AM.countDocuments()}`);
        console.log(`   isApproved=true  : ${finalApproved}`);
        console.log(`   workedHours > 0  : ${finalWithHours}`);
        console.log('\n🎉  Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌  Migration failed:', err);
        process.exit(1);
    }
})();
