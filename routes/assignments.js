const express = require('express');
const router = express.Router();
const verifyJWT = require('../middlewares/verifyJWT');
const moment = require('moment');

const Assignment = require('../models/Assignment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

// ─── Helper: create a notification record ────────────────────────────────────
async function createNotification({ userId, assignmentId, type, title, message, detail }) {
    try {
        const notif = new Notification({ userId, assignmentId, type, title, message, detail });
        await notif.save();
    } catch (err) {
        console.error('Failed to save notification:', err.message);
    }
}

// ─── POST /api/v1/assignments ─────────────────────────────────────────────────
// Admin creates a new assignment for an employee.
router.post('/', async (req, res) => {
    try {
        const { employeeId, title, type, site, shiftStart, shiftEnd, scheduledDate, workingHours, notes, status } = req.body;

        if (!employeeId || !title || !type) {
            return res.status(400).json({ error: 'employeeId, title, and type are required.' });
        }

        const assignment = new Assignment({
            employeeId,
            title,
            type,
            site: site || '',
            shiftStart: shiftStart || '',
            shiftEnd: shiftEnd || '',
            scheduledDate: scheduledDate || '',
            workingHours: workingHours || 0,
            notes: notes || '',
            status: status || 'pending',
        });

        await assignment.save();

        // Build notification detail string
        let detail = '';
        if (site) detail += `Site: ${site}. `;
        if (scheduledDate) detail += `Date: ${scheduledDate}. `;
        if (shiftStart && shiftEnd) detail += `Shift: ${shiftStart} → ${shiftEnd}. `;
        if (workingHours) detail += `Hours: ${workingHours}h.`;

        await createNotification({
            userId: employeeId,
            assignmentId: assignment._id,
            type: 'new_assignment',
            title: 'New Assignment',
            message: title,
            detail: detail.trim(),
        });

        return res.status(201).json({ msg: 'Assignment created.', assignment });
    } catch (err) {
        console.error('Create assignment error:', err.message);
        return res.status(500).json({ error: 'Server error.' });
    }
});

// ─── GET /api/v1/assignments ──────────────────────────────────────────────────
// Admin: list all assignments. Optional query param: ?employeeId=
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.employeeId) filter.employeeId = req.query.employeeId;

        const assignments = await Assignment.find(filter)
            .populate('employeeId', 'name lastName staffId workingSite')
            .sort({ createdAt: -1 });

        return res.status(200).json({ assignments });
    } catch (err) {
        console.error('Get assignments error:', err.message);
        return res.status(500).json({ error: 'Server error.' });
    }
});

// ─── GET /api/v1/assignments/my ───────────────────────────────────────────────
// Employee: fetch their own assignments (JWT required).
router.get('/my', verifyJWT, async (req, res) => {
    try {
        // After verifyJWT, req.user is set to the inner { id: "..." } object.
        // Prefer req.user.id, fall back to nested formats for safety.
        const userId = req.user.id || (req.user.user && req.user.user.id) || req.user._id;
        console.log('Mobile User ID from token:', userId);

        const assignments = await Assignment.find({ employeeId: userId })
            .sort({ createdAt: -1 });

        console.log(`Found ${assignments.length} assignments for user ${userId}`);
        return res.status(200).json({ assignments });
    } catch (err) {
        console.error('Get my assignments error:', err.message);
        return res.status(500).json({ error: 'Server error.' });
    }
});

// ─── GET /api/v1/assignments/notifications/:userId ────────────────────────────
// Employee: fetch all notifications for a given userId.
// Also dynamically surfaces overtime & payroll flags.
router.get('/notifications/:userId', verifyJWT, async (req, res) => {
    try {
        const userId = req.params.userId;

        // 1. Stored notifications (assignments, schedule updates, etc.)
        const stored = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);

        // 2. Dynamic: overtime flags from Attendance (last 30 days)
        const thirtyDaysAgo = moment().subtract(30, 'days').format('YYYY-MM-DD');
        const overtimeRecords = await Attendance.find({
            user: userId,
            date: { $gte: thirtyDaysAgo },
            $or: [{ overtime: { $gt: 0 } }, { overtimeTwo: { $gt: 0 } }],
        }).sort({ date: -1 }).limit(10);

        const overtimeNotifs = overtimeRecords.map(rec => ({
            _id: 'ot_' + rec._id,
            type: 'overtime_flag',
            title: 'Overtime Recorded',
            message: `You worked overtime on ${rec.date}`,
            detail: `OT1: ${rec.overtime}h, OT2: ${rec.overtimeTwo}h`,
            isRead: false,
            createdAt: rec.updatedAt || rec.createdAt,
        }));

        // Merge stored + dynamic, sort by date
        const all = [
            ...stored.map(n => n.toObject()),
            ...overtimeNotifs,
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const unreadCount = stored.filter(n => !n.isRead).length + overtimeNotifs.length;

        return res.status(200).json({ notifications: all, unreadCount });
    } catch (err) {
        console.error('Get notifications error:', err.message);
        return res.status(500).json({ error: 'Server error.' });
    }
});

// ─── GET /api/v1/assignments/unread-count/:userId ─────────────────────────────
// Lightweight endpoint: returns only the unread count (for the badge).
router.get('/unread-count/:userId', verifyJWT, async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            userId: req.params.userId,
            isRead: false,
        });
        return res.status(200).json({ unreadCount: count });
    } catch (err) {
        console.error('Unread count error:', err.message);
        return res.status(500).json({ error: 'Server error.' });
    }
});

// ─── PUT /api/v1/assignments/notifications/:notifId/read ─────────────────────
// Employee: mark a single notification as read.
router.put('/notifications/:notifId/read', verifyJWT, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.notifId, { isRead: true });
        return res.status(200).json({ msg: 'Marked as read.' });
    } catch (err) {
        console.error('Mark read error:', err.message);
        return res.status(500).json({ error: 'Server error.' });
    }
});

// ─── PUT /api/v1/assignments/notifications/read-all/:userId ──────────────────
// Employee: mark ALL notifications as read.
router.put('/notifications/read-all/:userId', verifyJWT, async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.params.userId, isRead: false }, { isRead: true });
        return res.status(200).json({ msg: 'All marked as read.' });
    } catch (err) {
        console.error('Mark all read error:', err.message);
        return res.status(500).json({ error: 'Server error.' });
    }
});

// ─── PUT /api/v1/assignments/:id ─────────────────────────────────────────────
// Admin: update an assignment (also creates a schedule_update notification).
router.put('/:id', async (req, res) => {
    try {
        const { title, type, site, shiftStart, shiftEnd, scheduledDate, workingHours, notes, status } = req.body;

        const assignment = await Assignment.findByIdAndUpdate(
            req.params.id,
            { $set: { title, type, site, shiftStart, shiftEnd, scheduledDate, workingHours, notes, status } },
            { new: true }
        );

        if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });

        // Determine notification type
        const notifType = workingHours !== undefined ? 'working_hours_update' : 'schedule_update';
        const notifTitle = notifType === 'working_hours_update' ? 'Working Hours Updated' : 'Schedule Updated';

        let detail = '';
        if (site) detail += `Site: ${site}. `;
        if (scheduledDate) detail += `Date: ${scheduledDate}. `;
        if (shiftStart && shiftEnd) detail += `Shift: ${shiftStart} → ${shiftEnd}. `;
        if (workingHours) detail += `Hours: ${workingHours}h.`;

        await createNotification({
            userId: assignment.employeeId,
            assignmentId: assignment._id,
            type: notifType,
            title: notifTitle,
            message: assignment.title,
            detail: detail.trim(),
        });

        return res.status(200).json({ msg: 'Assignment updated.', assignment });
    } catch (err) {
        console.error('Update assignment error:', err.message);
        return res.status(500).json({ error: 'Server error.' });
    }
});

// ─── DELETE /api/v1/assignments/:id ──────────────────────────────────────────
// Admin: delete an assignment and its notifications.
router.delete('/:id', async (req, res) => {
    try {
        const assignment = await Assignment.findByIdAndDelete(req.params.id);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });

        // Remove associated notifications
        await Notification.deleteMany({ assignmentId: req.params.id });

        return res.status(200).json({ msg: 'Assignment deleted.' });
    } catch (err) {
        console.error('Delete assignment error:', err.message);
        return res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
