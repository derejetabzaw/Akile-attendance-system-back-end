const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const _ = require('lodash');
// const generator = require('generate-password');
const auth = require('../middlewares/auth');
// const path = require('path');
const fs = require('fs');
const multer = require('multer');
const moment = require('moment');
const { calculateTotalHours } = require('../utils')
const { calculateOvertime } = require('../utilities/attendanceUtils');

const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
// const Site = require('../models/Site');
const { check, validationResult } = require('express-validator');
const verifyJWT = require('../middlewares/verifyJWT');
const { send: sendEmail } = require('../emailAlert/email/email');


const MIME_TYPES = {
    'image/jpeg': 'jpg',
    'image/jpeg': 'jpg',
    'image/png': 'png'
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        const extension = MIME_TYPES[file.mimetype];
        cb(null, file.fieldname + '-' + Date.now() + "." + extension);
    }
});

const upload = multer({ storage: storage }).single('image');

// @route    POST api/users/signup
// @desc     Register user
// @access   Public
router.post(
    '/signup',
    // verifyJWT,
    upload,
    [
        check('name', 'name is required!').not().isEmpty(),
        check('staffId', 'staffIf is required!').not().isEmpty(),
        check('gender', 'gender is required!').not().isEmpty(),
        check('workingSite', "workingSite is required!").not().isEmpty(),
        // check('password', "password is required!").not().isEmpty(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array() });
        }
        const { name, lastName, isAdmin, email, staffId, gender, image, position, workingSite, salary, telephone } = req.body;



        const password = "12345"
        const deviceId = "12345"



        try {
            let user = await User.findOne({ name });
            if (user) {
                return res.status(400).json({ error: [{ msg: "User already exists" }] });
            }

            let user_another = await User.findOne({ staffId });
            if (user_another) {
                return res.status(400).json({ error: [{ msg: "StaffID already exists" }] });
            }

            let imageUrl = "";
            if (image) {
                req.file.filename ? imageUrl = __dirname + '/../uploads/' + req.file.filename : imageUrl = "";

                const image = {
                    data: fs.readFileSync(imageUrl),
                    contentType: 'image/png'
                }
            }

            const salt = await bcrypt.genSalt(10);
            const passwords = await bcrypt.hash(password, salt);

            user = new User({
                name: name,
                lastName: lastName,
                deviceId: deviceId,
                staffId: staffId,
                image: image,
                password: passwords,
                imageUrl: imageUrl,
                isAdmin: isAdmin,
                email: email,
                gender: gender,
                position: position,
                workingSite: workingSite,
                salary: salary,
                telephone: telephone,
                isApproved: true,        // Admin-created users are pre-approved
                registeredViaApp: false,
            });

            // Generate a custom password for user
            // const generatedPassword = generator.generate({
            //     length: 10,
            //     number: true,
            //     uppercase: true,
            //     lowercase: true,
            //     symbols: true
            // });
            // const salt = await bcrypt.genSalt(10);

            // user.password = await bcrypt.hash(password, salt);

            await user.save();
            // const alertContent = {
            //     html: `<b>Hey there! </b><br> Your Credintials are Staff id: ${staffId} and password: ${generatedPassword}`,
            // };

            // return res.status(200).json({password: generatedPassword});
            return res.status(200).json(_.pick(user, ['_id', 'name', 'lastName', 'staffId', 'isAdmin', 'email', 'gender', 'position', 'imageUrl', 'workingSite', 'salary', 'telephone']));

        } catch (error) {
            console.log("Error:", error.message);
            return res.status(500).json({ error: [{ msg: "Internal sever error" }] });
        }
    }
);

// @route    GET api/users/pending
// @desc     Return all users pending approval (registered via app, not yet approved)
// @access   Private (admin)
router.get(
    '/pending',
    async (req, res) => {
        try {
            const pending = await User.find({ registeredViaApp: true, isApproved: false })
                .select('-password');
            return res.status(200).json({ users: pending });
        } catch (error) {
            console.error('Error fetching pending users:', error.message);
            return res.status(500).json({ msg: 'Server Error' });
        }
    }
);

// @route    PUT api/users/approve/:id
// @desc     Approve a pending app-registered user, set salary & position
// @access   Private (admin)
router.put(
    '/approve/:id',
    async (req, res) => {
        try {
            const { salary, position, workingSite, password } = req.body;

            if (!salary || !position) {
                return res.status(400).json({ error: 'Salary and position are required for approval.' });
            }

            const bcryptSalt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password || '12345', bcryptSalt);

            const user = await User.findByIdAndUpdate(
                req.params.id,
                {
                    $set: {
                        isApproved: true,
                        salary: salary,
                        position: position,
                        workingSite: workingSite || '',
                        password: hashedPassword,
                    }
                },
                { new: true }
            ).select('-password');

            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }

            // Send notification email to the approved user
            const emailContent = {
                text: `Welcome to Akile! Your account has been approved. Your Staff ID for logging in is: ${user.staffId}`,
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 20px auto; border: 1px solid #eeeeee; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <div style="text-align: center; margin-bottom: 25px;">
                            <h1 style="color: #4f100a; margin: 0;">Akile Attendance</h1>
                            <p style="color: #666; font-size: 14px;">Personnel Activation Notice</p>
                        </div>
                        <p style="font-size: 16px; color: #333;">Hello <strong>${user.name}</strong>,</p>
                        <p style="color: #555; line-height: 1.6;">Your registration has been successfully reviewed and approved by the administrator.</p>
                        <div style="background-color: #fcf8f8; border: 1px solid #f2e2e2; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                            <p style="margin: 0 0 10px 0; color: #777; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Use this Staff ID to Login:</p>
                            <span style="font-size: 28px; font-weight: bold; color: #4f100a; letter-spacing: 3px;">${user.staffId}</span>
                        </div>
                        <p style="color: #555; line-height: 1.6;">Please use your Staff ID and the password you created during signup to access the mobile application.</p>
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #999; text-align: center;">
                            <p>If you didn't request this or believe this was a mistake, please contact HR.</p>
                        </div>
                    </div>
                `
            };

            try {
                await sendEmail(user.email, emailContent, 'Akile Account Activation');
            } catch (emailErr) {
                console.error("Failed to send approval email:", emailErr.message);
                // We still 200 because the user IS approved in DB
            }

            return res.status(200).json({
                msg: 'User approved successfully and notification sent.',
                user,
            });
        } catch (error) {
            console.error('Approve error:', error.message);
            return res.status(500).json({ error: 'Server error during approval.' });
        }
    }
);

// @route    GET api/users
// @desc     Return all Registered users
// @access   Private
router.get(
    '/',
    // verifyJWT,
    async (req, res) => {
        try {
            const users = await User.find().lean();
            return res.status(200).json({ users });
        } catch (error) {
            console.log('Server error occured');
            return res.status(500).json({ msg: 'Server Error occured' });
        }
    }
);
// @route    UPDATE api/users/update-user/:id
// @desc     Update a user
// @access   Private
router.put(
    '/update-users/:id',
    // verifyJWT,
    async (req, res) => {
        console.log("ID:", req.params.id)
        try {
            let userId = req.params.id;

            // Fetch current user so we can detect a salary change
            const existingUser = await User.findById(userId);
            const salaryChanged = existingUser && req.body.salary &&
                String(existingUser.salary) !== String(req.body.salary);

            const updatedUser = await User.findOneAndUpdate(
                { _id: userId },
                {
                    $set: {
                        'email':       req.body.email,
                        'isAdmin':     req.body.isAdmin,
                        'deviceId':    req.body.deviceId,
                        'position':    req.body.position,
                        'workingSite': req.body.workingSite,
                        'salary':      req.body.salary,
                        'telephone':   req.body.telephone,
                    }
                },
                { new: true }
            );

            // Fire payroll notification if salary changed
            if (salaryChanged && updatedUser) {
                try {
                    await Notification.create({
                        userId:  updatedUser._id,
                        type:    'payroll_update',
                        title:   'Payroll Updated',
                        message: `Your basic salary has been updated to ${req.body.salary}`,
                        detail:  `Updated by admin on ${new Date().toLocaleDateString()}`,
                    });
                } catch (notifErr) {
                    console.error('Failed to create payroll notification:', notifErr.message);
                }
            }

            return res.status(200).json({ msg: "User Updated Successfully" });
        } catch (error) {
            console.log("Server error occured");
            res.status(500).json({ msg: "Server Error occured" });
        }
    });

// @route    DELETE api/users/delete-user/:id
// @desc     Delete a user
// @access   Private
router.delete(
    '/delete-user/:id',
    // verifyJWT,
    // auth, 
    async (req, res) => {
        try {

            let userId = req.params.id;
            await User.deleteOne({ staffId: userId });

            return res.status(200).json({ msg: "User Deleted Successfully" });
        } catch (error) {
            console.log("Server error occured");
            res.status(500).json({ msg: "Server Error occured" });
        }
    }
)

// @route    Get api/users/:id
// @desc     Get a single user
// @access   Private
router.get(
    '/:id',
    verifyJWT,
    async (req, res) => {
        try {
            let userId = req.params.id;
            const user = await User.findOne({ staffId: userId })

            if (!user) {
                return res
                    .status(400)
                    .json({ error: "User not found" })
            }
            return res
                .status(200)
                .json({ user })
        } catch (error) {
            console.log(error.message)
            return res
                .status(500)
                .json({ msg: "Server Error occured!" })
        }
    }
);

// @route Post api/users/checkin
// @desc Add user checkin time
// @access Private
router.post(
    '/checkin',
    auth,
    async (req, res) => {
        try {
            const { deviceId, Location } = req.body;
            const user = await User.findOne({ _id: req.user.id });

            if (!user) {
                return res.status(404).json({ msg: "User not found." });
            }

            // ── Device ID enforcement ──────────────────────────────────────
            // If the stored deviceId does not match what the phone sent,
            // we update the stored value instead of blocking check-in.
            // This preserves all attendance history when an employee changes
            // their phone. The admin can also update the device ID manually
            // from the dashboard via PUT /users/update-device/:id.
            if (deviceId) {
                if (!user.deviceId) {
                    // First time a device ID is recorded for this user
                    await User.findByIdAndUpdate(req.user.id, { $set: { deviceId } });
                    console.log(`[DeviceID] Stored first device ID for user ${user.staffId}: ${deviceId}`);
                } else if (user.deviceId !== deviceId) {
                    // Device changed – update silently and log for audit
                    console.warn(`[DeviceID] Device changed for user ${user.staffId}: ${user.deviceId} → ${deviceId}`);
                    await User.findByIdAndUpdate(req.user.id, { $set: { deviceId } });
                }
            }
            // ──────────────────────────────────────────────────────────────

            // Check if user is already checked in for today
            const lastRecord = await Attendance.findOne(
                { user: req.user.id, date: moment().format("YYYY-MM-DD") },
                {},
                { sort: { 'checkInTime': -1 } }
            );

            if (lastRecord && (!lastRecord.checkOutTime || lastRecord.checkOutTime === "")) {
                return res.status(400).json({ msg: "You are already checked in. Please check out first." });
            }

            // Check check-in limit (3 per day)
            const countToday = await Attendance.countDocuments({
                user: req.user.id,
                date: moment().format("YYYY-MM-DD")
            });

            if (countToday >= 3) {
                return res.status(400).json({ msg: "Check-in limit reached. Maximum 3 check-ins per day." });
            }

            const attendance = new Attendance({
                date: moment().format("YYYY-MM-DD"),
                user: req.user.id,
                checkInTime: moment().format("HH:mm:ss"),
                checkOutTime: "",
                numberOfCheckIn: countToday + 1,
                workedHours: 0,
                overtime: 0,
                overtimeTwo: 0,
            });

            await attendance.save();
            return res.status(200).json(attendance);

        } catch (error) {
            console.log(error.message);
            res.status(500).json({ msg: "Server Error occured" });
        }
    }
);

// @route Post api/users/checkout
// @desc Add user checkout time
// @access Private
router.post(
    '/checkout',
    auth,
    async (req, res) => {
        try {
            console.log("CHECKOUT BODY:", req.body);
            const user = await User.findOne({ _id: req.user.id });

            // Find the latest open attendance record for today
            const attendance = await Attendance.findOne({
                date: moment().format("YYYY-MM-DD"),
                user: req.user.id
            }, {}, { sort: { 'checkInTime': -1 } });

            if (!attendance || (attendance.checkOutTime && attendance.checkOutTime !== "")) {
                return res.status(400).json({ msg: "You must check in before checking out!" });
            }

            attendance.checkOutTime = moment().format("HH:mm:ss");
            const checkIn  = moment(attendance.checkInTime,  "HH:mm:ss");
            const checkOut = moment(attendance.checkOutTime, "HH:mm:ss");

            // Duration of this session
            let sessionHours = checkOut.diff(checkIn, 'hours', true);
            if (sessionHours < 0) sessionHours += 24; // overnight shift guard

            // Hours already accumulated today from other completed sessions
            const otherRecords = await Attendance.find({
                user: req.user.id,
                date: attendance.date,
                _id: { $ne: attendance._id }
            });

            const previousHours = otherRecords.reduce(
                (sum, r) => sum + (r.workedHours || 0) + (r.overtime || 0) + (r.overtimeTwo || 0),
                0
            );

            const otData = calculateOvertime(sessionHours, attendance.date, previousHours);

            attendance.workedHours  = otData.workHours;
            attendance.overtime     = otData.ot1;
            attendance.overtimeTwo  = otData.ot2;
            attendance.monthIdentifier = moment(attendance.date).format("YYYY-MM");

            await attendance.save();
            console.log("attendance updated:", attendance);
            return res.status(200).json(attendance);

        } catch (error) {
            console.log(error.message);
            res.status(500).json({ msg: "Server Error occured" });
        }
    }
);

// @route    PUT api/users/update-device/:id
// @desc     Admin manually sets / resets the registered device ID for a user.
//           Using _id of the user. All attendance history is preserved.
// @access   Private (admin)
router.put(
    '/update-device/:id',
    async (req, res) => {
        try {
            const { deviceId } = req.body;

            if (!deviceId && deviceId !== '') {
                return res.status(400).json({ error: 'deviceId field is required.' });
            }

            const user = await User.findByIdAndUpdate(
                req.params.id,
                { $set: { deviceId: deviceId } },
                { new: true }
            ).select('-password');

            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }

            console.log(`[DeviceID] Admin updated device ID for ${user.staffId} → '${deviceId}'`);
            return res.status(200).json({ msg: 'Device ID updated successfully.', deviceId: user.deviceId });
        } catch (error) {
            console.error('update-device error:', error.message);
            return res.status(500).json({ error: 'Server error.' });
        }
    }
);

// @route    POST api/users/change-password
// @desc     Change user password
// @access   Private (requires JWT)
router.post(
    '/change-password',
    verifyJWT,
    async (req, res) => {
        try {
            const { oldPassword, newPassword } = req.body;

            if (!oldPassword || !newPassword) {
                return res.status(400).json({ error: 'Old password and new password are required.' });
            }

            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }

            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: 'Old password is incorrect.' });
            }

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
            await user.save();

            return res.status(200).json({ msg: 'Password changed successfully.' });
        } catch (error) {
            console.log(error.message);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }
);

module.exports = router;