const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');

// const User = require('../models/User');
const Site = require('../models/Site');

// @route    GET api/sites
// @desc     Return all Registered sites
// @access   Private
router.get(
    '/',
    // auth,
    async (req, res) => {
        try {
            
            const sites = await Site.find();
            return res.status(200).json({ sites });
        } catch (error) {
            console.log("Server error occured");
            return res.status(500).json({ msg: "Server Error occured" });
        }
    }
);
module.exports = router;
