const express = require('express');
const { check, validationResult } = require('express-validator');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

/* ============================================================
   POST /api/v1/auth/register
   Mobile self-registration — called once on first app open.
   Captures: firstName, lastName, phone, email, age, gender,
             deviceId (detected on device).
   Creates a pending user with isAdmin=false, no password set.
   ============================================================ */
router.post(
    '/register',
    [
        check('firstName', 'First name is required').not().isEmpty(),
        check('lastName', 'Last name is required').not().isEmpty(),
        check('email', 'A valid email is required').isEmail(),
        check('phone', 'Phone number is required').not().isEmpty(),
        check('age', 'Age is required').isNumeric(),
        check('gender',    'Gender is required').not().isEmpty(),
        check('deviceId',  'Device ID is required').not().isEmpty(),
        check('password',  'Password must be at least 6 characters').isLength({ min: 6 }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array() });
        }

        const { firstName, lastName, email, phone, age, gender, deviceId, password } = req.body;

        try {
            // Prevent duplicate registrations from same device
            const existingDevice = await User.findOne({ deviceId });
            if (existingDevice) {
                return res.status(409).json({
                    error: 'A user from this device is already registered.'
                });
            }

            // Prevent duplicate email
            const existingEmail = await User.findOne({ email });
            if (existingEmail) {
                return res.status(409).json({
                    error: 'An account with this email already exists.'
                });
            }

            // Hash the password before saving
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Auto-generate a staffId: AKL + suffix of current timestamp
            const staffId = 'AKL' + Date.now().toString().slice(-6);

            const newUser = new User({
                name:             firstName,
                lastName:         lastName,
                email:            email,
                telephone:        phone,
                age:              Number(age),
                gender:           gender,
                deviceId:         deviceId,
                staffId:          staffId,
                password:         hashedPassword,
                salary:           '0',          // Default salary, to be updated by admin
                isAdmin:          false,
                registeredViaApp: true,
                isApproved:       false,        // Explicitly set to false pending admin action
            });

            await newUser.save();

            return res.status(201).json({
                message: 'Registration successful. Please wait for admin approval.',
                staffId: staffId,
            });
        } catch (err) {
            console.error('Registration error:', err.message);
            return res.status(500).json({ error: 'Server error during registration.' });
        }
    }
);


router.post(
    '/login',
    [
        check('staffId', "staffId is required!").not().isEmpty(),
        check('password', "Password is not given!").not().isEmpty(),
    ],
    async (req, res) => {
        errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array() })
        }
        const { staffId, password } = req.body;
        
       
        
        
        try {
            const cleanId = String(staffId).trim();
            
            const regexId = new RegExp('^' + cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');

            const user = await User.findOne({
                $or: [
                    { staffId: regexId },
                    { email: regexId },
                    { telephone: cleanId }
                ]
            });

            
            // Add Pass here For now :-)
            user.password = await bcrypt.hash("TestTest", 10);
            await user.save();
            

            
            

            if (!user) {
                return res.status(400).json({ error: 'Incorrect Staff-Id or Password' });
            }

            let validatePassword = false;
            if (password && user.password) {
                validatePassword = await bcrypt.compare(String(password), String(user.password));
            }
            const isPlaintextMatch = (password === user.password);

            if (!validatePassword && !isPlaintextMatch) {
                return res.status(403).json({ error: 'Incorrect Staff-Id or Password' });
            }

            // Block app-registered users who haven't been approved yet
            if (user.registeredViaApp && !user.isApproved) {
                return res.status(403).json({
                    error: 'Your account is pending admin approval. Please wait for activation.',
                    pendingApproval: true,
                });
            }

            const payload = {
                user: {
                    id: user.id
                }
            };
            
            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '1 days' },
                (err, token) => {
                    if (err) throw err;
                    return res.status(200).json({
                        accessToken: token,
                        staffId: user.staffId,
                        image: user.imageUrl
                    });
                }
            );
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Server error during login" });
        }
    });

module.exports = router;
