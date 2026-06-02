const express = require('express');
const router = express.Router();
const verifyJWT = require('../middlewares/verifyJWT');

const Attendance = require('../models/Attendance');
const { calculateOvertime } = require('../utilities/attendanceUtils');
const moment = require('moment');

// @route    GET /api/v1/attendance
// @desc     Return all attendance records
// @access   Private
router.get(
    '/',
    verifyJWT,
    async (req, res) => {
        try {
            const attendances = await Attendance.find().sort({ date: -1 }).lean();
            
            // Group records by user AND date to calculate cumulative daily overtime
            const groups = {};
            attendances.forEach(a => {
                const key = `${a.user}_${a.date}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(a);
            });

            const enrichedAttendances = [];

            // Process each user-day group
            Object.keys(groups).forEach(key => {
                const dayRecords = groups[key].sort((a, b) => 
                    (a.checkInTime || '').localeCompare(b.checkInTime || ''));
                
                let dailyPrevHours = 0;
                dayRecords.forEach(a => {
                    let totalInSession = (a.workedHours || 0) + (a.overtime || 0) + (a.overtimeTwo || 0);
                    
                    // Fallback: If totalInSession is 0 but we have both check-in and check-out times, calculate from timestamps
                    if (totalInSession === 0 && a.checkInTime && a.checkOutTime && a.checkOutTime !== "") {
                        const checkIn = moment(a.checkInTime, "HH:mm:ss");
                        const checkOut = moment(a.checkOutTime, "HH:mm:ss");
                        let diff = checkOut.diff(checkIn, 'hours', true);
                        if (diff < 0) diff += 24;
                        if (diff > 0) {
                            totalInSession = diff;
                        }
                    }

                    // Handle active sessions (no checkout)
                    if ((!a.checkOutTime || a.checkOutTime === "") && a.checkInTime && a.date && moment(a.date, ["YYYY-MM-DD", "dddd, DD-MM-YYYY", "DD,MM,YYYY"]).isSame(moment(), 'day')) {
                        const checkIn = moment(a.checkInTime, "HH:mm:ss");
                        const now = moment();
                        let sessionHours = now.diff(checkIn, 'hours', true);
                        if (sessionHours < 0) sessionHours = 0;
                        totalInSession = sessionHours;
                    }

                    // Re-calculate OT based on cumulative hours for the day
                    const otData = calculateOvertime(totalInSession, a.date, dailyPrevHours);
                    
                    // Update fields for display (even if not saved to DB yet)
                    a.overtime = otData.ot1;
                    a.overtimeTwo = otData.ot2;
                    a.workedHours = otData.workHours;
                    
                    enrichedAttendances.push(a);
                    dailyPrevHours += totalInSession;
                });
            });

            // Sort back by date descending for the list view
            enrichedAttendances.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

            return res.status(200).json({ attendances: enrichedAttendances });
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
            const moment = require('moment');
            const now = moment();
            const currentMonth = now.format("YYYY-MM");
            const today = now.format("YYYY-MM-DD");
            
            const monthToQuery = req.query.month || currentMonth;
            
            console.log(`[SUMMARY] User: ${req.params.userId}, Month: ${monthToQuery}, Now: ${now.format("HH:mm:ss")}`);

            let query = { user: req.params.userId };
            if (monthToQuery !== 'all') {
                query.date = { $regex: new RegExp(`^${monthToQuery}`) };
            }

            const records = await Attendance.find(query).lean();
            console.log(`[SUMMARY] Found ${records.length} records for user ${req.params.userId}`);

            // We'll group records by date to correctly calculate daily overtime
            const recordsByDate = {};
            records.forEach(r => {
                const d = r.date;
                if (!recordsByDate[d]) recordsByDate[d] = [];
                recordsByDate[d].push(r);
            });

            let totalWorkHours = 0;
            let todayWorkHours = 0;
            let totalOT1 = 0;
            let totalOT2 = 0;

            // Process each day's records
            Object.keys(recordsByDate).forEach(dateStr => {
                let dailyPrevHours = 0;
                // Sort records of the same day by check-in time to calculate OT sequentially
                const dayRecords = recordsByDate[dateStr].sort((a, b) => 
                    (a.checkInTime || '').localeCompare(b.checkInTime || ''));

                dayRecords.forEach(r => {
                    let sessionTotal = (r.workedHours || 0) + (r.overtime || 0) + (r.overtimeTwo || 0);

                    // Fallback: If sessionTotal is 0 but we have both check-in and check-out times, calculate from timestamps
                    if (sessionTotal === 0 && r.checkInTime && r.checkOutTime && r.checkOutTime !== "") {
                        const checkIn = moment(r.checkInTime, "HH:mm:ss");
                        const checkOut = moment(r.checkOutTime, "HH:mm:ss");
                        let diff = checkOut.diff(checkIn, 'hours', true);
                        if (diff < 0) diff += 24;
                        if (diff > 0) {
                            sessionTotal = diff;
                        }
                    }

                    const otData = calculateOvertime(sessionTotal, dateStr, dailyPrevHours);
                    
                    totalWorkHours += otData.workHours;
                    totalOT1 += otData.ot1;
                    totalOT2 += otData.ot2;
                    
                    if (dateStr === today) {
                        todayWorkHours += otData.workHours;
                    }
                    
                    dailyPrevHours += sessionTotal;
                });
            });

            // Add ongoing session hours if still checked in today
            const activeRecord = records.find(r => r.date === today && (!r.checkOutTime || r.checkOutTime === ""));
            if (activeRecord) {
                const checkIn = moment(activeRecord.checkInTime, "HH:mm:ss");
                let sessionHours = now.diff(checkIn, 'hours', true);
                if (sessionHours < 0) sessionHours = 0;

                // Calculate accumulated hours TODAY BEFORE this active session
                const previousHours = records
                    .filter(r => r.date === today && r._id.toString() !== activeRecord._id.toString())
                    .reduce((sum, r) => sum + (r.workedHours || 0) + (r.overtime || 0) + (r.overtimeTwo || 0), 0);

                const activeOT = calculateOvertime(sessionHours, today, previousHours);

                totalWorkHours += activeOT.workHours;
                todayWorkHours += activeOT.workHours;
                totalOT1 += activeOT.ot1;
                totalOT2 += activeOT.ot2;
            }

            return res.status(200).json({
                userId: req.params.userId,
                month: monthToQuery,
                totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
                todayWorkHours: parseFloat(todayWorkHours.toFixed(2)),
                totalOT1: parseFloat(totalOT1.toFixed(2)),
                totalOT2: parseFloat(totalOT2.toFixed(2)),
                recordCount: records.length
            });
        } catch (error) {
            console.log("Server error occured", error);
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

// @route    POST /api/v1/attendance/approve-month
// @desc     Approve all records for a month (admin)
// @access   Private
router.post(
    '/approve-month',
    verifyJWT,
    async (req, res) => {
        try {
            const { month, userId } = req.body; // month: "YYYY-MM"
            if (!month) return res.status(400).json({ msg: "Month is required" });

            let query = {
                $or: [
                    { monthIdentifier: month },
                    { date: { $regex: new RegExp(`^${month}`) } }
                ]
            };

            if (userId) {
                query = {
                    $and: [
                        query,
                        { user: userId }
                    ]
                };
            }

            await Attendance.updateMany(query, { $set: { isApproved: true } });

            return res.status(200).json({ msg: `Records for ${month} approved successfully.` });
        } catch (error) {
            console.log("Server error occured", error);
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
            
            // Prioritize the ID from the authenticated token
            const userId = (req.user && req.user.user && req.user.user.id) 
                ? req.user.user.id 
                : req.params.userId;

            console.log(`[DEBUG] Checking status for User: ${userId}, Date: ${today}`);
            
            // Find the latest record for today
            const lastRecord = await Attendance.findOne(
                { user: userId, date: today },
                {},
                { sort: { 'checkInTime': -1 } }
            );

            if (!lastRecord) {
                console.log(`[DEBUG] No record found for ${userId} on ${today}`);
                return res.status(200).json({ status: "checkedOut", recordCount: 0 });
            }

            console.log(`[DEBUG] Found record: In=${lastRecord.checkInTime}, Out=${lastRecord.checkOutTime}`);

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

