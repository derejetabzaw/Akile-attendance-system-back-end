const express = require('express');
const router = express.Router();
const verifyJWT = require('../middlewares/verifyJWT');

const Attendance = require('../models/Attendance');

// @route    GET /api/v1/attendance
// @desc     Return all attendance records
// @access   Private
router.get(
    '/',
    verifyJWT,
    async (req, res) => {
        try {
            const attendances = await Attendance.find().sort({ date: -1 });
            return res.status(200).json({ attendances });
        } catch (error) {
            console.log("Server error occured");
            return res.status(500).json({ msg: "Server Error occured" });
        }
    }
);

// @route    GET /api/v1/attendance/user/:userId
// @desc     Return attendance records for a specific user (by MongoDB _id)
// @access   Private
router.get(
    '/user/:userId',
    verifyJWT,
    async (req, res) => {
        try {
            const { date } = req.query; // optional ?date=YYYY-MM-DD filter
            const query = { user: req.params.userId };
            if (date) query.date = date;

            const attendances = await Attendance.find(query).sort({ date: -1 });
            return res.status(200).json({ attendances });
        } catch (error) {
            console.log("Server error occured");
            return res.status(500).json({ msg: "Server Error occured" });
        }
    }
);

// @route    GET /api/v1/attendance/summary/:userId
// @desc     Return total worked hours, overtime1, overtime2 for a user (optionally filtered by month YYYY-MM)
// @access   Private
router.get(
    '/summary/:userId',
    verifyJWT,
    async (req, res) => {
        try {
            const { month } = req.query; // optional ?month=YYYY-MM
            let query = { user: req.params.userId };

            const records = await Attendance.find(query);

            const filtered = month
                ? records.filter(r => r.date && r.date.startsWith(month))
                : records;

            const totalWorkedHours = filtered.reduce((sum, r) => sum + (r.workedHours || 0), 0);
            const totalOT1 = filtered.reduce((sum, r) => sum + (r.overtime || 0), 0);
            const totalOT2 = filtered.reduce((sum, r) => sum + (r.overtimeTwo || 0), 0);

            return res.status(200).json({
                userId: req.params.userId,
                month: month || 'all-time',
                totalWorkedHours: parseFloat(totalWorkedHours.toFixed(2)),
                totalOT1: parseFloat(totalOT1.toFixed(2)),
                totalOT2: parseFloat(totalOT2.toFixed(2)),
                recordCount: filtered.length
            });
        } catch (error) {
            console.log("Server error occured");
            return res.status(500).json({ msg: "Server Error occured" });
        }
    }
);

// @route    PUT /api/v1/attendance/:id
// @desc     Manually correct an attendance record (admin)
// @access   Private
router.put(
    '/:id',
    verifyJWT,
    async (req, res) => {
        try {
            const updated = await Attendance.findByIdAndUpdate(
                req.params.id,
                { $set: req.body },
                { new: true }
            );
            if (!updated) {
                return res.status(404).json({ msg: 'Attendance record not found' });
            }
            return res.status(200).json({ msg: 'Attendance record updated', attendance: updated });
        } catch (error) {
            console.log("Server error occured");
            return res.status(500).json({ msg: "Server Error occured" });
        }
    }
);

// @route    GET /api/v1/attendance/status/:userId
// @desc     Return current attendance status for a specific user
// @access   Private
router.get(
    '/status/:userId',
    verifyJWT,
    async (req, res) => {
        try {
            const moment = require('moment');
            const today = moment().format("YYYY-MM-DD");
            
            // Find the latest record for today
            const lastRecord = await Attendance.findOne(
                { user: req.params.userId, date: today },
                {},
                { sort: { 'checkInTime': -1 } }
            );

            if (!lastRecord) {
                return res.status(200).json({ status: "checkedOut", recordCount: 0 });
            }

            if (!lastRecord.checkOutTime || lastRecord.checkOutTime === "") {
                return res.status(200).json({ 
                    status: "checkedIn", 
                    checkInTime: lastRecord.checkInTime,
                    recordCount: await Attendance.countDocuments({ user: req.params.userId, date: today })
                });
            } else {
                return res.status(200).json({ 
                    status: "checkedOut", 
                    checkOutTime: lastRecord.checkOutTime,
                    recordCount: await Attendance.countDocuments({ user: req.params.userId, date: today })
                });
            }
        } catch (error) {
            console.log("Server error occured", error);
            return res.status(500).json({ msg: "Server Error occured" });
        }
    }
);

module.exports = router;

