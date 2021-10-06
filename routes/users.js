const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const _ = require('lodash');
const generator = require('generate-password');
const auth = require('../middlewares/auth');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const moment = require('moment');
const { calculateTotalHours } = require('../utils')

const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { check, validationResult } = require('express-validator');

const MIME_TYPES ={
    'image/jpeg': 'jpg',
    'image/jpeg': 'jpg',
    'image/png': 'png'
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        const extension = MIME_TYPES[file.mimetype];
        cb(null, file.fieldname + '-' + Date.now() + "." + extension );
    }
});

const upload = multer({ storage: storage }).single('image');

// @route    POST api/users/signup
// @desc     Register user
// @access   Public
router.post(
    '/signup',
    upload,
    [
        check('name', 'name is required!').not().isEmpty(),
        check('staffId', 'staffIf is required!').not().isEmpty(),
        check('gender', 'gender is required!').not().isEmpty(),
        check('workingSite', "workingSite is required!").not().isEmpty()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array() });
        }
        const { name, isAdmin, email, staffId, gender, image, password, position, workingSite, deviceId } = req.body;
        try {
            let user = await User.findOne({ name });
            if (user) {
                return res.status(400).json({ error: [{ msg: "User already exists" }] });
            }

            let user_another = await User.findOne({ staffId });
            if (user_another) {
                return res.status(400).json({ error: [{ msg: "StaffID already exists" }] });
            }



            let imageUrl = "";
            if(image) {
                req.file.filename ? imageUrl=__dirname + '/../uploads/' + req.file.filename: imageUrl="";
            
            const image = {
                data: fs.readFileSync(imageUrl),
                contentType: 'image/png'
                }
            }
            

            user = new User({
                name,
                deviceId,
                staffId,
                image,
                password,
                imageUrl,
                isAdmin,
                email,
                gender,
                position,
                workingSite
            });


            // Generate a custom password for user
            // const generatedPassword = generator.generate({
            //     length: 10,
            //     number: true,
            //     uppercase: true,
            //     lowercase: true,
            //     symbols: true
            // });

            const salt = await bcrypt.genSalt(10);

            user.password = await bcrypt.hash(password, salt);
            await user.save();
            // const alertContent = {
            //     html: `<b>Hey there! </b><br> Your Credintials are Staff id: ${staffId} and password: ${generatedPassword}`,
            // };

            // return res.status(200).json({password: generatedPassword});
            return res.status(200).json(_.pick(user, ['_id', 'name', 'staffId', 'password', 'isAdmin', 'email', 'gender', 'position', 'imageUrl', 'workingSite']));

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
            const user = await User.findOneAndUpdate(userId, req.body);
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
            const user = await User.findByIdAndRemove(userId);
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
);

// @route Post api/users/checkin
// @desc Add user checkin time
// @access Private
router.post(
    '/checkin',
    auth,
    async (req, res) =>{
        try {
            console.log("res::",req.headers.authorization)
            //  check if user deviceId matches
            // console.log(req.body)
            const { deviceId, Location } = req.body;
            // const { Location } = parseInt(req.body.position);
            const user = await User.findOne({_id: req.user.id});

            console.log(deviceId)
            console.log(req.body)
            console.log(req.user.id)
            console.log(user)
            // console.log(Location)
 
            // if (user.deviceId == deviceId) {
                // check if user already checkes in before
                // const checkInTime= await Attendance.findOne({date: moment().format("YYYY-MM-DD"), user: req.user.id }).select("checkInTime");
                // if(checkInTime) {
                //     res.status(400).json({"error": "You already checked in for today"});
                // } else {
                //     const attendance = new Attendance({
                //         date: moment().format("YYYY-MM-DD"),
                //         user: req.user.id,
                //         checkInTime: moment().format("HH:mm:ss"),
                //         checkOutTime: ""
                //     });
                //     await attendance.save();
                //     res.status(200).json(attendance);
                // }
            const attendance = new Attendance({
                        date: moment().format("dddd, DD-MM-YYYY"),
                        user: req.user.id,
                        checkInTime: moment().format("HH:mm:ss"),
                        checkOutTime: ""
                    });
            await attendance.save();
            // console.log("attendance", attendance)
            // console.log("first_check_in_time", attendance.checkInTime)
            console.log("posted-attendance-information",attendance);

            res.status(200).json(attendance);
                
            // } else {
            //     res.status(400).json({"error": "You can only check-in with your registered device"});
            // }
        } catch (error) {
            console.log(error.message);
            res.status(500).json({ msg: "Server Error occured"});
        }
    }
);

// @route Post api/users/checkout
// @desc Add user checkout time
// @access Private
router.post(
    '/checkout',
    auth,
    async (req, res) =>{
        try {
            const { deviceId } = req.body;
            console.log("BODY:" , req.user)
            const user = await User.findOne({_id: req.user.id});
            // if (deviceId == user.deviceId) {

            const attendance = await Attendance.findOne({
                // date: moment().format("dddd-YYYY-MM-DD"), 
                date: moment().format("dddd, DD-MM-YYYY"),
                user: req.user.id},{},{ sort: { 'checkInTime' : -1 } });
            
            
            // if(attendance && attendance.checkOutTime == "") {
            //     // add user checkout time
            //     attendance.checkOutTime = moment().format("HH:mm:ss");
            //     await attendance.save();
            //     const totalHours = calculateTotalHours(attendance.checkInTime, attendance.checkOutTime);
            //     user.workedHours = totalHours
            //     await user.save();
            //     res.status(200).json(attendance);
            // }else if (attendance && !(attendance.checkOutTime == "")){
            //     return res.status(400).json({ msg: "You've checked-out already for today!"});
            // }
            // else {
            //     return res.status(400).json({ msg: "You've to check-in before checking-out!"});
            // }
            attendance.checkOutTime = moment().format("HH:mm:ss");
            const day = moment().format("dddd");
            const date = moment().format("DD,MM,YYYY");
            // attendance.checkInDay = moment().format("YYYY-MM-DD");
            
            // Attendance.findOne({}, {}, { sort: { 'created_at' : -1 } }, function(err, post) {
            //     console.log( "Here" );
            //   });
            
            // console.log("attendance.checkInDay: ",attendance.checkInDay)
            // const get_day = moment().format("dddd");

            console.log("attendance.checkInTime: ",attendance.checkInTime)
            console.log("attendance.checkOutTime: ",attendance.checkOutTime)
            console.log("attendance.checkin_Date:" , attendance.date)
            await attendance.save();

            const totalHours = calculateTotalHours(attendance.checkInTime, attendance.checkOutTime, day, date);
            console.log("totalHours: ",totalHours)
            user.workedHours = totalHours[0]

            // console.log("attendance: ", attendance)
            console.log("user: ",user)
            await user.save();
            res.status(200).json(attendance);

            
        // } else {
            res.status(400).json({"error": "You can only check-out with your registered device"});
            
        } catch (error) {
            console.log(error.message);
            res.status(500).json({ msg: "Server Error occured"});
        }
    }
);

module.exports = router;
