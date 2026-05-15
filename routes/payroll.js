const express = require('express');
const router = express.Router();
const verifyJWT = require('../middlewares/verifyJWT');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

// @route    GET /api/v1/payroll/calculate
// @desc     Calculate monthly payroll based on approved attendance
// @access   Private
router.get(
    '/calculate',
    verifyJWT,
    async (req, res) => {
        try {
            const { month } = req.query; // YYYY-MM
            if (!month) return res.status(400).json({ msg: "Month (YYYY-MM) is required" });

            const users = await User.find({ isApproved: true });
            const payrollData = [];

            for (const user of users) {
                // Find all approved attendance records for this user and month
                const records = await Attendance.find({
                    user: user._id,
                    monthIdentifier: month,
                    isApproved: true
                });

                const totalWorkHours = records.reduce((sum, r) => sum + (r.workedHours || 0), 0);
                const totalOT1 = records.reduce((sum, r) => sum + (r.overtime || 0), 0);
                const totalOT2 = records.reduce((sum, r) => sum + (r.overtimeTwo || 0), 0);

                const baseSalary = parseFloat(user.salary) || 0;
                
                // Sample rates (can be customized)
                // Hourly rate = Base Salary / 160 (standard work hours per month)
                const hourlyRate = baseSalary / 160;
                const ot1Pay = totalOT1 * (hourlyRate * 1.5);
                const ot2Pay = totalOT2 * (hourlyRate * 2.0);
                const totalPay = baseSalary + ot1Pay + ot2Pay;

                payrollData.push({
                    userId: user._id,
                    staffId: user.staffId,
                    name: `${user.name} ${user.lastName}`,
                    baseSalary: baseSalary.toFixed(2),
                    totalWorkHours: totalWorkHours.toFixed(1),
                    totalOT1: totalOT1.toFixed(1),
                    totalOT2: totalOT2.toFixed(1),
                    ot1Pay: ot1Pay.toFixed(2),
                    ot2Pay: ot2Pay.toFixed(2),
                    totalNetPay: totalPay.toFixed(2)
                });
            }

            return res.status(200).json({ month, payroll: payrollData });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: "Server Error" });
        }
    }
);

module.exports = router;
