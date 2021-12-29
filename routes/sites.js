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
            return res.status(200).json({sites});// Not modified 
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
        console.log(site);
        await site.save();
         return res.status(200).json(_.pick(site, ['_id', 'sitename', 'location','latitude','longitude', 'sitemanager', 'paintarea']));

    }catch(error){
        console.log(error)
        return res.status(500).json({ error: [{ msg: "Internal sever error" }] });
    }

    }
  
)
router.put('/update-sites/:id',async(req,res)=>
{
    console.log(req.body)
    Site.updateOne({_id:req.params.id},{$set:req.body},(err,response)=>{
        if(err){
            console.log(err);
            console.log(req.params.id)
            response.json({message:"operation failed"})
        }

    })

        
    });



router.delete('/delete-sites/:id',(req,res)=>{
    console.log(req.params)
       Site.deleteOne({ _id:req.params.id},(err)=>{
        console.log("record deleted")
        if(err){res.json({message:"Error Occured cannot complete that operation"})}
    })
})
module.exports = router;
