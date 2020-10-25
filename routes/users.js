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

// @route    GET api/users
// @desc     Return all Registered users
// @access   Private
router.get(
    '/',
    auth,
    async (req, res) => {
        try {
            const users = await User.find();
            return res.status(200).json({ users });
        } catch (error) {
            console.log("Server error occured");
            return res.status(500).json({ msg: "Server Error occured" });
        }

    }
);

// @route    UPDATE api/users/:id
// @desc     Update a user
// @access   Private
router.put(
    '/:id',
    auth,
    async (req, res) => {
        try {
            let userId = req.params.id;
            const user = await User.findByIdAndUpdate(userId, req.body);
            await user.save();
            return res.status(200).json({ user });
        } catch (error) {
            console.log("Server error occured");
            res.status(500).json({ msg: "Server Error occured" });
        }
    }
);

// @route    DELETE api/users/:id
// @desc     Delete a user
// @access   Private
router.delete(
    '/:id',
    auth,
    async (req, res) => {
        try {
            let userId = req.params.id;
            const user = await User.findByIdAndDelete(userId);
            if (!user) {
                return res.status(400).json({ error: "User not found" });
            }
            return res.status(200).json({ msg: "User deleted successfully" });
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
    auth,
    async (req, res) => {
        try {
            let userId = req.params.id;
            const user = await User.findOne({ _id: userId });
            if (!user) {
                return res.status(400).json({ error: "User not found" });
            }
            return res.status(200).json({ user });
        } catch (error) {
            console.log(error.message);
            res.status(500).json({ msg: "Server Error occured" });
        }
    }
)

module.exports = router;
