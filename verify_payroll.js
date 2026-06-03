require('dotenv').config();
const mongoose = require('mongoose');
const moment = require('moment');
const { calculateOvertime } = require('./utilities/attendanceUtils');

const A = mongoose.model('attendance', new mongoose.Schema({}, { strict: false }));
const U = mongoose.model('user', new mongoose.Schema({}, { strict: false }));

(async () => {
    await mongoose.connect(process.env.PROD_DB_URL);

    const users = await U.find({ isApproved: true }).lean();
    const startDate = '2026-05-01';
    const endDate   = '2026-05-31';

    for (const user of users) {
        const records = await A.find({
            user: user._id,
            date: { $gte: startDate, $lte: endDate },
            isApproved: true
        }).lean();

        console.log(`\nUser: ${user.name} ${user.lastName || ''} | salary=${user.salary} | Records found: ${records.length}`);

        if (records.length === 0) continue;

        const byDate = {};
        records.forEach(r => { if (!byDate[r.date]) byDate[r.date] = []; byDate[r.date].push(r); });

        let totalWork = 0, totalOT1 = 0, totalOT2 = 0;

        for (const [dateStr, daySessions] of Object.entries(byDate)) {
            let dailyPrev = 0;
            const sorted = daySessions.sort((a, b) => (a.checkInTime || '').localeCompare(b.checkInTime || ''));
            for (const r of sorted) {
                let sessionTotal = (r.workedHours || 0) + (r.overtime || 0) + (r.overtimeTwo || 0);
                if (sessionTotal === 0 && r.checkInTime && r.checkOutTime && r.checkOutTime !== '') {
                    const ci = moment(r.checkInTime, 'HH:mm:ss');
                    const co = moment(r.checkOutTime, 'HH:mm:ss');
                    let diff = co.diff(ci, 'hours', true);
                    if (diff < 0) diff += 24;
                    if (diff > 0) sessionTotal = diff;
                }
                const ot = calculateOvertime(sessionTotal, dateStr, dailyPrev);
                totalWork += ot.workHours;
                totalOT1  += ot.ot1;
                totalOT2  += ot.ot2;
                dailyPrev += sessionTotal;
                console.log(`  ${dateStr} in:${r.checkInTime} out:${r.checkOutTime} | stored w:${r.workedHours} ot:${r.overtime} ot2:${r.overtimeTwo} | computed w:${ot.workHours} ot1:${ot.ot1} ot2:${ot.ot2}`);
            }
        }

        const salary      = parseFloat(user.salary) || 0;
        const hourlyRate  = salary / 160;
        const basePay     = totalWork * hourlyRate;
        const ot1Pay      = totalOT1  * hourlyRate * 1.5;
        const ot2Pay      = totalOT2  * hourlyRate * 2.0;
        const totalNetPay = basePay + ot1Pay + ot2Pay;

        console.log(`  ── TOTALS: workHours=${totalWork.toFixed(2)}  OT1=${totalOT1.toFixed(2)}  OT2=${totalOT2.toFixed(2)}`);
        console.log(`  ── PAY:    base=${basePay.toFixed(2)}  ot1Pay=${ot1Pay.toFixed(2)}  ot2Pay=${ot2Pay.toFixed(2)}  net=${totalNetPay.toFixed(2)}`);
    }

    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
