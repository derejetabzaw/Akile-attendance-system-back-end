const express = require('express');
const router = express.Router();
const Payroll = require('../models/Payroll');

router.post('/', async (req, res) => {
    try {
        const { staffId, transportAllowance, salaryAdvance } = req.body;
        const date = new Date();
        const day = date.getDate();
        const month = date.getMonth() + 3; // Add 1 because getMonth() returns 0th indexed value
        const year = date.getFullYear();
        // Set default values for transportAllowance and salaryAdvance if they have null or undefined values
        const ta = transportAllowance ?? 0;
        const sa = salaryAdvance ?? 0;
        const payroll = await Payroll.findOne({ staffId });

        if (payroll) {
            const existingPayroll = payroll.date.find(p => p.month === month && p.year === year && p.day === day);
            if (existingPayroll) {
                existingPayroll.transportAllowance += ta;
                existingPayroll.salaryAdvance += sa;
            } else {
                payroll.date.push({ day, month, year, transportAllowance: ta, salaryAdvance: sa });
            }
            await payroll.save();
            res.status(200).send({ message: 'Payroll updated successfully' });
        } else {
            const newPayroll = new Payroll({
                staffId,
                date: [{ day, month, year, transportAllowance: ta, salaryAdvance: sa }]
            });
            await newPayroll.save();
            res.status(201).send({ message: 'New payroll created successfully' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;