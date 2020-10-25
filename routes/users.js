const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const _ = require('lodash');
const auth = require('../middlewares/auth');

const User = require('../models/User');
const { check, validationResult } = require('express-validator');

// @route    POST api/users/signup
// @desc     Register user
// @access   Public
router.post(
    '/signup',
    [
        check('name', 'Name is required').not().isEmpty(),
        check('staffId', 'Staff id is required').not().isEmpty(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array() });
        }
        const { name, staffId, isAdmin } = req.body;
        try {
            let user = await User.findOne({ name });
            console.log(user);
            if (user) {
                return res.status(400).json({ error: [{ msg: "User already exists" }] });
            }

            user = new User({
                name,
                staffId,
                isAdmin
            });

            const salt = await bcrypt.genSalt(10);

            user.staffId = await bcrypt.hash(staffId, salt);
            await user.save();

            return res.status(200).json(_.pick(user, ['_id', 'name', 'isAdmin']));

        } catch (error) {
            console.log(error.message);
            return res.status(500).json({ error: [{ msg: "Internal sever error" }] });
        }
    }
);

module.exports = router;
