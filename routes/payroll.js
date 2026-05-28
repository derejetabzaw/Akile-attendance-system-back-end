const express = require('express');
const router = express.Router();
const verifyJWT = require('../middlewares/verifyJWT');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Allowance = require('../models/Allowance');
const Settings = require('../models/Settings');
const { calculateOvertime } = require('../utilities/attendanceUtils');

// Helper: get a settings value by key, with a fallback default
async function getSetting(key, fallback) {
    const s = await Settings.findOne({ key });
    return s ? s.value : fallback;
}

// @route    GET /api/v1/payroll/calculate
// @desc     Calculate payroll for a date range based on approved attendance
// @access   Private
router.get(
    '/calculate',
    verifyJWT,
    async (req, res) => {
        try {
            // Accept full date range: startDate / endDate (YYYY-MM-DD)
            // Also accept legacy startMonth / endMonth for backwards compatibility
            let { startDate, endDate, startMonth, endMonth } = req.query;

            // Convert month-only params to date ranges
            if (!startDate && startMonth) startDate = `${startMonth}-01`;
            if (!endDate && endMonth) {
                // Last day of endMonth
                const [y, m] = endMonth.split('-').map(Number);
                const lastDay = new Date(y, m, 0).getDate();
                endDate = `${endMonth}-${String(lastDay).padStart(2, '0')}`;
            }

            if (!startDate || !endDate) {
                return res.status(400).json({ msg: "startDate and endDate (YYYY-MM-DD) are required" });
            }

            // Load configurable rates from settings
            const ot1Rate = await getSetting('ot1Rate', 1.5);
            const ot2Rate = await getSetting('ot2Rate', 2.0);

            const users = await User.find({ isApproved: true });
            const payrollData = [];

            for (const user of users) {
                // Fetch all APPROVED attendance records within the date range
                const records = await Attendance.find({
                    user: user._id,
                    date: { $gte: startDate, $lte: endDate },
                    isApproved: true
                }).lean();

                // ----- Re-compute hours the same way the summary route does -----
                // Group by date so daily OT accumulation is correct
                const byDate = {};
                records.forEach(r => {
                    if (!byDate[r.date]) byDate[r.date] = [];
                    byDate[r.date].push(r);
                });

                let totalWorkHours = 0;
                let totalOT1 = 0;
                let totalOT2 = 0;

                Object.keys(byDate).forEach(dateStr => {
                    let dailyPrev = 0;
                    // Sort sessions within a day by check-in time
                    const daySessions = byDate[dateStr].sort((a, b) =>
                        (a.checkInTime || '').localeCompare(b.checkInTime || ''));

                    daySessions.forEach(r => {
                        // Total time in this session (stored fields)
                        const sessionTotal = (r.workedHours || 0) + (r.overtime || 0) + (r.overtimeTwo || 0);
                        const otData = calculateOvertime(sessionTotal, dateStr, dailyPrev);
                        totalWorkHours += otData.workHours;
                        totalOT1 += otData.ot1;
                        totalOT2 += otData.ot2;
                        dailyPrev += sessionTotal;
                    });
                });

                const baseSalary = parseFloat(user.salary) || 0;
                // Hourly rate based on 160 standard hours / month
                const hourlyRate = baseSalary / 160;
                const basePay = totalWorkHours * hourlyRate;
                const ot1Pay = totalOT1 * (hourlyRate * ot1Rate);
                const ot2Pay = totalOT2 * (hourlyRate * ot2Rate);

                // Fetch allowances/advances that fall within the date range by monthIdentifier
                // monthIdentifier is YYYY-MM so we convert dates to months for the lookup
                const startMonth2 = startDate.slice(0, 7);
                const endMonth2 = endDate.slice(0, 7);
                const allowances = await Allowance.find({
                    user: user._id,
                    monthIdentifier: { $gte: startMonth2, $lte: endMonth2 }
                });
                const totalTransportAllowance = allowances.reduce((s, a) => s + (a.transportAllowance || 0), 0);
                const totalSalaryAdvance = allowances.reduce((s, a) => s + (a.salaryAdvance || 0), 0);

                const totalNetPay = basePay + ot1Pay + ot2Pay + totalTransportAllowance - totalSalaryAdvance;

                payrollData.push({
                    userId: user._id,
                    staffId: user.staffId,
                    name: `${user.name} ${user.lastName}`,
                    baseSalary: baseSalary.toFixed(2),
                    basePay: basePay.toFixed(2),
                    totalWorkHours: totalWorkHours.toFixed(2),
                    totalOT1: totalOT1.toFixed(2),
                    totalOT2: totalOT2.toFixed(2),
                    ot1Pay: ot1Pay.toFixed(2),
                    ot2Pay: ot2Pay.toFixed(2),
                    ot1Rate,
                    ot2Rate,
                    transportAllowance: totalTransportAllowance.toFixed(2),
                    salaryAdvance: totalSalaryAdvance.toFixed(2),
                    totalNetPay: totalNetPay.toFixed(2),
                    recordCount: records.length,
                });
            }

            return res.status(200).json({ startDate, endDate, payroll: payrollData });
        } catch (error) {
            console.error('[Payroll Error]', error);
            return res.status(500).json({ msg: 'Server Error' });
        }
    }
);

module.exports = router;
