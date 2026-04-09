const express = require('express');
const router = express.Router();
const verifyJWT = require('../middlewares/verifyJWT');
const { check, validationResult } = require('express-validator');
const _ = require('lodash');

// const User = require('../models/User');
const Site = require('../models/Site');

// @route    GET api/sites
// @desc     Return all Registered sites
// @access   Private
router.get(
    '/',
    verifyJWT,
    async (req, res) => {
        try {
            const sites = await Site.find();
            return res.status(200).json({ sites });// Not modified 
        } catch (error) {
            console.log("Server error occured");
            return res.status(500).json({ msg: "Server Error occured" });
        }
    }
);
router.post(
    '/addsite',
    verifyJWT,
    async (req, res) => {
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            return res
                .status(400)
                .json({ error: errors.array() })
        }
        const { sitename, location, latitude, longitude, sitemanager, paintarea } = req.body

        try {
            let site = new Site({
                sitename,
                location,
                latitude,
                longitude,
                sitemanager,
                paintarea
            })
            console.log(site);

            await site.save();
            return res
                .status(200)
                .json(_.pick(site, ['_id', 'sitename', 'location', 'latitude', 'longitude', 'sitemanager', 'paintarea']));

        } catch (error) {
            console.log(error)
            return res
                .status(500)
                .json({ error: [{ msg: "Internal sever error" }] });
        }

    }

)
router.put('/update-sites/:id',
    verifyJWT,
    async (req, res) => {
        try {
            const updated = await Site.findByIdAndUpdate(
                req.params.id,
                { $set: req.body },
                { new: true }
            );
            if (!updated) {
                return res.status(404).json({ msg: 'Site not found' });
            }
            return res.status(200).json({ msg: 'Site updated successfully', site: updated });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ msg: 'Server error occurred' });
        }
    });

//needs validations

router.delete('/delete-sites/:id',
    verifyJWT,
    async (req, res) => {
        try {
            const deleted = await Site.findByIdAndDelete(req.params.id);
            if (!deleted) {
                return res.status(404).json({ msg: 'Site not found' });
            }
            console.log('Site deleted:', req.params.id);
            return res.status(200).json({ msg: 'Site deleted successfully' });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ msg: 'Server error occurred' });
        }
    })
module.exports = router;
