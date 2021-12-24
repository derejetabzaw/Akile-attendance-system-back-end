const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { check, validationResult } = require('express-validator');
const _ = require('lodash');

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
router.post(
    '/addsite',async (req,res)=>
    {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
             return res.status(400).json({ error: errors.array() });

        }
        const{sitename,location,latitude,longitude,sitemanager,paintarea} = req.body;

        try{
        
        let site = new Site({
            sitename,
            location,
            latitude,
            longitude,
            sitemanager,
            paintarea
        })
        await site.save();
         return res.status(200).json(_.pick(site, ['_id', 'sitename', 'location','latitude','longitude', 'sitemanager', 'paintarea']));

    }catch(error){
        console.log(error)
        return res.status(500).json({ error: [{ msg: "Internal sever error" }] });
    }

    }
)
module.exports = router;
