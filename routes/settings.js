const express = require('express');
const router = express.Router();
const verifyJWT = require('../middlewares/verifyJWT');
const Settings = require('../models/Settings');

// Default settings seeded on first access
const DEFAULTS = [
    { key: 'minRadius', value: 200, label: 'Minimum Sign-in Radius', description: 'Minimum radius (in meters) required for sign-in/sign-out.' },
    { key: 'ot1Rate', value: 1.5, label: 'OT1 Pay Rate', description: 'Multiplier for OT1 (night overtime) — e.g., 1.5 means 1.5x hourly rate.' },
    { key: 'ot2Rate', value: 2.0, label: 'OT2 Pay Rate', description: 'Multiplier for OT2 (weekend/holiday overtime) — e.g., 2.0 means 2x hourly rate.' },
];

async function seedDefaults() {
    for (const d of DEFAULTS) {
        const exists = await Settings.findOne({ key: d.key });
        if (!exists) await Settings.create(d);
    }
}

// @route  GET /api/v1/settings
// @desc   Get all settings
// @access Private
router.get('/', verifyJWT, async (req, res) => {
    try {
        await seedDefaults();
        const settings = await Settings.find({});
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// @route  PUT /api/v1/settings/:key
// @desc   Update a setting by key
// @access Private
router.put('/:key', verifyJWT, async (req, res) => {
    try {
        const { value } = req.body;
        if (value === undefined) return res.status(400).json({ error: 'Value is required' });

        const updated = await Settings.findOneAndUpdate(
            { key: req.params.key },
            { value },
            { new: true, upsert: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
