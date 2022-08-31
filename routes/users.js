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
const Site = require('../models/Site');
const { check, validationResult } = require('express-validator');
const verifyJWT = require('../middlewares/verifyJWT');


const MIME_TYPES = {
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
        cb(null, file.fieldname + '-' + Date.now() + "." + extension);
    }
});

const upload = multer({ storage: storage }).single('image');

// @route    POST api/users/signup
// @desc     Register user
// @access   Public
router.post(
    '/signup',
    verifyJWT,
    upload,
    [
        check('name', 'name is required!').not().isEmpty(),
        check('staffId', 'staffIf is required!').not().isEmpty(),
        check('gender', 'gender is required!').not().isEmpty(),
        check('workingSite', "workingSite is required!").not().isEmpty(),
        check('password', "password is required!").not().isEmpty(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array() });
        }
        const { name, isAdmin, email, staffId, gender, image, password, position, workingSite, deviceId, salary, telephone } = req.body;
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
            if (image) {
                req.file.filename ? imageUrl = __dirname + '/../uploads/' + req.file.filename : imageUrl = "";

                const image = {
                    data: fs.readFileSync(imageUrl),
                    contentType: 'image/png'
                }
            }

            const salt = await bcrypt.genSalt(10);
            const passwords = await bcrypt.hash(password, salt);

            user = new User({
                name: name,
                deviceId: deviceId,
                staffId: staffId,
                image: image,
                password: passwords,
                imageUrl: imageUrl,
                isAdmin: isAdmin,
                email: email,
                gender: gender,
                position: position,
                workingSite: workingSite,
                salary: salary,
                telephone: telephone,
            });


            // Generate a custom password for user
            // const generatedPassword = generator.generate({
            //     length: 10,
            //     number: true,
            //     uppercase: true,
            //     lowercase: true,
            //     symbols: true
            // });
            // const salt = await bcrypt.genSalt(10);

            // user.password = await bcrypt.hash(password, salt);

            await user.save();
            // const alertContent = {
            //     html: `<b>Hey there! </b><br> Your Credintials are Staff id: ${staffId} and password: ${generatedPassword}`,
            // };

            // return res.status(200).json({password: generatedPassword});
            return res.status(200).json(_.pick(user, ['_id', 'name', 'staffId', 'deviceId', 'password', 'isAdmin', 'email', 'gender', 'position', 'imageUrl', 'workingSite', 'salary', 'telephone']));

        } catch (error) {
            console.log("Error:", error.message);
            return res.status(500).json({ error: [{ msg: "Internal sever error" }] });
        }
    }
);

// @route    GET api/users
// @desc     Return all Registered users
// @access   Private
router.get(
    '/',
    verifyJWT,
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
// @route    UPDATE api/users/update-user/:id
// @desc     Update a user
// @access   Private
router.put(
    '/update-users/:id',
    verifyJWT,
    async (req, res) => {
        console.log("ID:", req.params.id)

        try {

            let userId = req.params.id;
            console.log(typeof (req.body.email))
            User.findOneAndUpdate({ _id: userId }, {
                $set: {
                    'password': req.body.password,
                    'email': req.body.email,
                    'isAdmin': req.body.isAdmin,
                    'deviceId': req.body.deviceId,
                    'position': req.body.position,
                    'workingSite': req.body.workingSite,
                    'salary': req.body.salary,
                    'telephone': req.body.telephone,
                    'deviceId': req.body.deviceId
                }
            }, { new: true }, (err, response) => {
                if (err) {
                    console.log(err);
                    console.log(req.params.id)
                    response.json({ message: "operation failed" })
                }
            })
            return res.status(200).json({ msg: "User Updated Successfully" });
        } catch (error) {
            console.log("Server error occured");
            res.status(500).json({ msg: "Server Error occured" });
        }
    });

// @route    DELETE api/users/delete-user/:id
// @desc     Delete a user
// @access   Private
router.delete(
    '/delete-user/:id',
    verifyJWT,
    // auth, 
    async (req, res) => {
        try {

            let userId = req.params.id;
            User.deleteOne({ staffId: userId }, (err) => {
                if (err) { console.log("Error While Deleting") }
            })

            return res.status(200).json({ msg: "User Deleted Successfully" });
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
    verifyJWT,
    async (req, res) => {
        try {
            let userId = req.params.id;
            const user = await User.findOne({ staffId: userId })

            if (!user) {
                return res
                    .status(400)
                    .json({ error: "User not found" })
            }
            return res
                .status(200)
                .json({ user })
        } catch (error) {
            console.log(error.message)
            return res
                .status(500)
                .json({ msg: "Server Error occured!" })
        }
    }
);

// @route Post api/users/checkin
// @desc Add user checkin time
// @access Private
router.post(
    '/checkin',
    auth,
    async (req, res) => {
        try {
            console.log("res::", req.headers.authorization, "\n")
            //  check if user deviceId matches
            //console.log(req.body)
            const { deviceId, Location } = req.body;
            // const { Location } = parseInt(req.body.position);
            const user = await User.findOne({ _id: req.user.id });

            console.log(deviceId)
            // console.log(req.body)
            // console.log(req.user.id)
            // console.log(user)

            // console.log(Location)  // On line 215 it prints the position so this line not needed
            // line 213 - 216 copied to 223 - 226 before commented

            // if (user.deviceId == deviceId) {

            // console.log(deviceId);
            // console.log(req.body);
            // console.log(req.user.id);
            // console.log(user);    

            //check if user already checkes in before
            const checkInTime = await Attendance.findOne({ date: moment().format("YYYY-MM-DD"), user: req.user.id }).select("checkInTime");
            // if(checkInTime) {
            //     console.log(checkInTime);
            //     res.status(400).json({"error": "You already checked in for today"});
            // } 
            //else {
            // const attendance = new Attendance({
            //     date: moment().format("YYYY-MM-DD"),
            //     user: req.user.id,
            //     checkInTime: moment().format("HH:mm:ss"),
            //     checkOutTime: "",
            //     workedHours: 0
            // });
            // var previousTotalWorkedHours = await Attendance.findOne({user: req.user.id },{},{ sort: { 'checkOutTime' : -1 , 'date':-1 } });
            // console.log("previous:",previousTotalWorkedHours)

            let currentDate = new Date().toISOString().slice(0, 10);
            var previousLoginInformation = await Attendance.findOne({ user: req.user.id, date: currentDate }, {}, { sort: { 'checkOutTime': -1, 'checkInTime': -1, 'date': 'desc' } });

            var previousNumberOfCheckins = previousLoginInformation

            const attendance = new Attendance({
                date: moment().format("YYYY-MM-DD"),
                user: req.user.id,
                checkInTime: moment().format("HH:mm:ss"),
                checkOutTime: "",
                numberOfCheckIn: 1,
                workedHours: 0,
            });

            if (previousNumberOfCheckins != null) {
                attendance.numberOfCheckIn = previousNumberOfCheckins.numberOfCheckIn + 1;
            }

            console.log("USERID:", req.user.id)
            console.log("Current numberOfCheckIn", attendance.numberOfCheckIn)

            if (currentDate == attendance.date) {   // Not sure how to get todays date and device date while checkin
                if (attendance.numberOfCheckIn < 4) {

                    await attendance.save();
                    res.status(200).json(attendance);
                }
                else {
                    console.log("Error Checking In:", attendance.numberOfCheckIn)
                    console.log("Number of Checkin per day exceeded 3")
                }
            }
            else {
                console.log("Error! Date is not equal to today.")
            }

            //          await attendance.save();
            //            console.log("posted-attendance-information",attendance);
            //      res.status(200).json(attendance);
            //    } 
            // THIS ELSE STATEMENT IS THE SAME AS 244 TO 256, SO DELETE THE LINE WHEN MAKING THE ELSE UNCOMMENTED
            //const attendance = new Attendance({
            //date: moment().format("dddd, DD-MM-YYYY"),
            //user: req.user.id,
            //checkInTime: moment().format("HH:mm:ss"),
            //checkOutTime: ""
            //});
            //await attendance.save();
            // console.log("attendance", attendance)
            // console.log("first_check_in_time", attendance.checkInTime)
            //console.log("posted-attendance-information",attendance);
            //res.status(200).json(attendance);

            // await attendance.save();

            // // console.log("attendance", attendance)
            // // console.log("first_check_in_time", attendance.checkInTime)
            // console.log("posted-attendance-information",attendance);

            // res.status(200).json(attendance);


            // } else {
            //    res.status(400).json({"error": "You can only check-in with your registered device"});

        } catch (error) {
            console.log(error.message);
            res.status(500).json({ msg: "Server Error occured" });
        }
    }
);

// @route Post api/users/checkout
// @desc Add user checkout time
// @access Private
router.post(
    '/checkout',
    auth,
    async (req, res) => {
        try {
            const { deviceId } = req.body;
            // console.log("BODY:" , req.user)
            const user = await User.findOne({ _id: req.user.id });
            //if (deviceId == user.deviceId) {
            if (deviceId != user.deviceId) {

                const attendance = await Attendance.findOne({
                    // date: moment().format("dddd-YYYY-MM-DD"), 
                    //date: moment().format("dddd, DD-MM-YYYY"),
                    date: moment().format("YYYY-MM-DD"),
                    user: req.user.id
                }, {}, { sort: { 'checkInTime': -1 } });


                // const workedHours = await Attendance.findOne({user: req.user.id }).select("workedHours");
                // console.log("checkworkedhours:",workedHours)
                let currentDate = new Date().toISOString().slice(0, 10);


                var previousLoginInformation = await Attendance.findOne({ user: req.user.id, date: currentDate }, {}, { sort: { 'checkOutTime': -1, 'checkInTime': -1, 'date': 'desc' } });

                console.log("previousLoginInformation", previousLoginInformation)

                if (previousLoginInformation.date === currentDate && previousLoginInformation.checkOutTime !== null) {
                    var previousWorkedHours = previousLoginInformation.workedHours

                    //                    var previousNumberOfCheckins = previousLoginInformation.numberOfCheckIn

                    attendance.checkOutTime = moment().format("HH:mm:ss");
                    const day = moment().format("dddd");
                    const date = moment().format("DD,MM,YYYY");
                    const totalHours = calculateTotalHours(attendance.checkInTime, attendance.checkOutTime, day, date);
                    attendance.workedHours = parseFloat(previousWorkedHours) + totalHours[0]

                    // attendance.numberOfCheckIn = parseFloat(previousNumberOfCheckins) + 1

                    await attendance.save();
                    await user.save();
                    console.log("attendanceHASPREVIOUS: ", attendance)
                    res.status(200).json(attendance);

                }

                // if(attendance && attendance.checkOutTime == "") {
                // add user checkout time
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
                else {
                    attendance.checkOutTime = moment().format("HH:mm:ss");
                    const day = moment().format("dddd");
                    const date = moment().format("DD,MM,YYYY");
                    // attendance.checkInDay = moment().format("YYYY-MM-DD");

                    // Attendance.findOne({}, {}, { sort: { 'created_at' : -1 } }, function(err, post) {
                    //     console.log( "Here" );
                    //   });

                    // console.log("attendance.checkInDay: ",attendance.checkInDay)
                    // const get_day = moment().format("dddd");

                    // console.log("attendance.checkInTime: ",attendance.checkInTime)
                    // console.log("attendance.checkOutTime: ",attendance.checkOutTime)
                    // console.log("attendance.checkin_Date:" , attendance.date)
                    // console.log("previous ", attendance.workedHours)

                    const totalHours = calculateTotalHours(attendance.checkInTime, attendance.checkOutTime, day, date);
                    attendance.workedHours = parseFloat(totalHours[0])

                    // console.log("after ", attendance.workedHours)

                    await attendance.save();
                    await user.save();
                    console.log("attendance: ", attendance)
                    res.status(200).json(attendance);
                }

            } else {
                res.status(400).json({ "error": "You can only check-out with your registered device" });
            }
        } catch (error) {
            console.log(error.message);
            res.status(500).json({ msg: "Server Error occured" });
        }
    }
);

module.exports = router;
