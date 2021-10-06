const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');

const User = require('../models/User');
const Attendance = require('../models/Attendance');

// @route    GET api/attendances
// @desc     Return all Registered attendances
// @access   Private
router.get(
    '/',
    auth,
    async (req, res) => {
        try {
            
            const attendances = await Attendance.find();
            return res.status(200).json({ attendances });
        } catch (error) {
            console.log("Server error occured");
            return res.status(500).json({ msg: "Server Error occured" });
        }
    }
);
module.exports = router;
