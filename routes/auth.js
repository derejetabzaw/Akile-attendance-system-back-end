const express = require('express');
const { check, validationResult } = require('express-validator');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');


router.post(
    '/login',
    [
        check('staffId', "staffId is required!").not().isEmpty(),
        check('password', "Password is required!").not().isEmpty(),
    ],
    async (req, res) => {
        errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array() })
        }
        const { staffId, password } = req.body;
        const user = await User.findOne({ staffId });

        if (!user) {
            return res.status(400).json({ error: 'Incorrect staffId or password' });
        }

        const validatePassword = await bcrypt.compare(password, user.password);

        if (!validatePassword) {
            return res.status(403).json({ error: 'Incorrect staffId or password' });
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
                return res.status(200).json({ 
                    accessToken: token,
                    staffId: user.staffId,
                    image: user.imageUrl
                })
            }
        );
    });

module.exports = router;
