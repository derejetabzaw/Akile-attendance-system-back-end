const express = require('express');
const { check, validationResult } = require('express-validator');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');


router.post(
    '/login',
    [
        check('name', "Name is required!").not().isEmpty(),
        check('staffId', "staffId is required").not().isEmpty()
    ],
    async (req, res) => {
        errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array() })
        }
        const { name, staffId } = req.body;
        const user = await User.findOne({ name });

        if (!user) {
            return res.status(400).json({ error: 'Incorrect email or staffid' });
        }

        const validatePassword = await bcrypt.compare(staffId, user.staffId);

        if (!validatePassword) {
            return res.status(403).json({ error: 'Incorrect email or staffid' });
        }

        const payload = {
            user: {
                id: user.id
            }
        }

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1 days' },
            (err, token) => {
                if (err) throw err;
                return res.status(200).json({ token })
            }
        );
    });

module.exports = router;
