const express = require('express');
const router = express.Router();
const verifyJWT = require('../middlewares/verifyJWT');
const Allowance = require('../models/Allowance');

// @route    POST /api/v1/allowance
// @desc     Add or update allowance/advance for a user and month
// @access   Private
router.post('/', verifyJWT, async (req, res) => {
    try {
        const { userId, monthIdentifier, transportAllowance, salaryAdvance } = req.body;
        
        if (!userId || !monthIdentifier) {
            return res.status(400).json({ error: "User and Month are required." });
        }

        let record = await Allowance.findOne({ user: userId, monthIdentifier });
        if (record) {
            record.transportAllowance = transportAllowance || 0;
            record.salaryAdvance = salaryAdvance || 0;
            await record.save();
        } else {
            record = new Allowance({
                user: userId,
                monthIdentifier,
                transportAllowance: transportAllowance || 0,
                salaryAdvance: salaryAdvance || 0
            });
            await record.save();
        }

        return res.status(200).json(record);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// @route    GET /api/v1/allowance/:month
// @desc     Get all allowances for a month
// @access   Private
router.get('/:month', verifyJWT, async (req, res) => {
    try {
        const records = await Allowance.find({ monthIdentifier: req.params.month }).populate('user', 'name lastName staffId');
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
