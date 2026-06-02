/**
 * migrate_production.js
 * -----------------------------------------------------------------------
 * Run once against the production MongoDB Atlas database to:
 *   1. Backfill `monthIdentifier` on every attendance record that is missing it.
 *   2. Recalculate & save `workedHours`, `overtime`, `overtimeTwo` for every
 *      attendance record where those fields are 0 (or missing) but both
 *      checkInTime and checkOutTime exist.
 *   3. Seed default Settings (ot1Rate, ot2Rate) if not already present.
 *
 * Usage:
 *   node migrate_production.js
 *
 * Make sure the PROD DB_URL is active in .env (or edit PROD_DB_URL below).
 * -----------------------------------------------------------------------
 */

require('dotenv').config();
const mongoose = require('mongoose');
const moment   = require('moment');
const { calculateOvertime } = require('./utilities/attendanceUtils');

// ── Target DB ─────────────────────────────────────────────────────────────────
// Uses env var if set, otherwise falls back to hard-coded production URI.
const PROD_DB_URL =
    process.env.PROD_DB_URL ||
    'mongodb+srv://attendance_db_user:OaMupcIYoZlxNi3P@attendance.x4qpr6m.mongodb.net/akille_db?appName=attendance';

// ── Inline schemas (avoids any middleware surprises during migration) ──────────
const AttendanceSchema = new mongoose.Schema({
    user:             mongoose.Schema.Types.ObjectId,
    date:             String,
    checkInTime:      String,
    checkOutTime:     String,
    numberOfCheckIn:  Number,
    workedHours:      Number,
    overtime:         Number,
    overtimeTwo:      Number,
    isApproved:       Boolean,
    monthIdentifier:  String,
});

const SettingsSchema = new mongoose.Schema({
    key:   { type: String, unique: true },
    value: mongoose.Schema.Types.Mixed,
    label: String,
});

const AttendanceModel = mongoose.model('attendance', AttendanceSchema);
const SettingsModel   = mongoose.model('settings',   SettingsSchema);

// ── Helpers ───────────────────────────────────────────────────────────────────
function deriveMonthIdentifier(dateStr) {
    const parsed = moment(dateStr, [
        'YYYY-MM-DD',
        'dddd, DD-MM-YYYY',
        'DD,MM,YYYY',
        'DD-MM-YYYY',
    ]);
    return parsed.isValid()
        ? parsed.format('YYYY-MM')
        : dateStr.substring(0, 7);
}

function normalizeDate(dateStr) {
    // Converts any supported format to YYYY-MM-DD for OT calc
    const parsed = moment(dateStr, [
        'YYYY-MM-DD',
        'dddd, DD-MM-YYYY',
        'DD,MM,YYYY',
        'DD-MM-YYYY',
    ]);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
    try {
        console.log('⏳  Connecting to production database …');
        await mongoose.connect(PROD_DB_URL, {
            useNewUrlParser:    true,
            useUnifiedTopology: true,
        });
        console.log('✅  Connected to production database.\n');

        // ── 1. Backfill monthIdentifier ────────────────────────────────────
        console.log('── STEP 1: Backfill monthIdentifier ──────────────────────────');
        const missingMonthId = await AttendanceModel.find({
            $or: [
                { monthIdentifier: { $exists: false } },
                { monthIdentifier: null },
                { monthIdentifier: '' },
            ],
        }).lean();

        console.log(`   Found ${missingMonthId.length} records missing monthIdentifier.`);

        let monthFixed = 0;
        for (const rec of missingMonthId) {
            const mi = deriveMonthIdentifier(rec.date || '');
            if (mi) {
                await AttendanceModel.updateOne(
                    { _id: rec._id },
                    { $set: { monthIdentifier: mi } }
                );
                monthFixed++;
            }
        }
        console.log(`   ✅  Fixed monthIdentifier on ${monthFixed} records.\n`);

        // ── 2. Recalculate hours for records with 0/missing hours ──────────
        console.log('── STEP 2: Recalculate workedHours / overtime ────────────────');
        const zeroHourRecords = await AttendanceModel.find({
            checkInTime:  { $exists: true, $ne: '' },
            checkOutTime: { $exists: true, $ne: '' },
            $or: [
                { workedHours: 0 },
                { workedHours: { $exists: false } },
                { workedHours: null },
            ],
        }).lean();

        console.log(`   Found ${zeroHourRecords.length} checked-out records with 0/missing hours.`);

        // Group by user + date so we can feed previousHours into calculateOvertime
        const byUserDate = {};
        for (const r of zeroHourRecords) {
            const key = `${r.user}_${r.date}`;
            if (!byUserDate[key]) byUserDate[key] = [];
            byUserDate[key].push(r);
        }

        let hoursFixed = 0;
        for (const key of Object.keys(byUserDate)) {
            // Sort within the day by checkInTime
            const dayRecs = byUserDate[key].sort((a, b) =>
                (a.checkInTime || '').localeCompare(b.checkInTime || ''));

            let dailyPrev = 0;

            for (const rec of dayRecs) {
                const checkIn  = moment(rec.checkInTime,  'HH:mm:ss');
                const checkOut = moment(rec.checkOutTime, 'HH:mm:ss');
                let diff = checkOut.diff(checkIn, 'hours', true);
                if (diff < 0) diff += 24; // overnight shift

                if (diff <= 0) {
                    dailyPrev += (rec.workedHours || 0) + (rec.overtime || 0) + (rec.overtimeTwo || 0);
                    continue;
                }

                const dateNorm = normalizeDate(rec.date) || rec.date;
                const otData   = calculateOvertime(diff, dateNorm, dailyPrev);

                await AttendanceModel.updateOne(
                    { _id: rec._id },
                    {
                        $set: {
                            workedHours: otData.workHours,
                            overtime:    otData.ot1,
                            overtimeTwo: otData.ot2,
                        },
                    }
                );

                dailyPrev += diff;
                hoursFixed++;
            }
        }
        console.log(`   ✅  Recalculated hours on ${hoursFixed} records.\n`);

        // ── 3. Seed default Settings ───────────────────────────────────────
        console.log('── STEP 3: Seed default Settings ─────────────────────────────');
        const defaults = [
            { key: 'ot1Rate',          value: 1.5,  label: 'OT1 Rate (1.5x)' },
            { key: 'ot2Rate',          value: 2.0,  label: 'OT2 Rate (2x)'   },
            { key: 'checkInRadius',    value: 200,  label: 'Check-in Radius (m)' },
            { key: 'standardHours',    value: 160,  label: 'Standard Monthly Hours' },
        ];

        for (const d of defaults) {
            const existing = await SettingsModel.findOne({ key: d.key });
            if (!existing) {
                await SettingsModel.create(d);
                console.log(`   ➕  Created setting: ${d.key} = ${d.value}`);
            } else {
                console.log(`   ✔   Setting already exists: ${d.key} = ${existing.value}`);
            }
        }
        console.log('   ✅  Settings seeded.\n');

        console.log('🎉  Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌  Migration failed:', err);
        process.exit(1);
    }
})();
