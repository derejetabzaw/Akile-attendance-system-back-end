const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const _ = require('lodash');
const generator = require('generate-password');
const auth = require('../middlewares/auth');
const { Email } = require('../emailAlert');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const User = require('../models/User');
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
        check('name', 'Name is required!').not().isEmpty(),
        check('email', 'Email id is required!').not().isEmpty().isEmail(),
        check('gender', 'Gender is required!').not().isEmpty(),
        check('workingSite', "Working Site is required!").not().isEmpty()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array() });
        }
        const { name, isAdmin, email, gender, position, workingSite } = req.body;
        try {
            let user = await User.findOne({ name });
            if (user) {
                return res.status(400).json({ error: [{ msg: "User already exists" }] });
            }

            // Generate random staff id for employees
            const staffId = "Ak-" + String(Math.floor(Math.random() * 10000))
            const imageUrl = __dirname + '/../uploads/' + req.file.filename;
            const image = {
                data: fs.readFileSync(imageUrl),
                contentType: 'image/png'
            }

            user = new User({
                name,
                staffId,
                image,
                imageUrl,
                isAdmin,
                email,
                gender,
                position,
                workingSite
            });


            // Generate a custom password for user
            const generatedPassword = generator.generate({
                length: 10,
                number: true,
                uppercase: true,
                lowercase: true,
                symbols: true
            })

            const salt = await bcrypt.genSalt(10);

            user.password = await bcrypt.hash(generatedPassword, salt);
            await user.save();
            const alertContent = {
                html: `<b>Hey there! </b><br> Your Credintials are Staff id: ${staffId} and password: ${generatedPassword}`,
            };

            await Email.send(email, alertContent, "akile attendance system credintial info");
            return res.status(200).json(_.pick(user, ['_id', 'name', 'isAdmin', 'email', 'imageUrl', 'gender', 'position', 'workingSite']));

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
            const user = await User.findByIdAndUpdate(userId, req.body);
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
            const user = await User.findByIdAndDelete(userId);
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
)

module.exports = router;
