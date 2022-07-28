const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

const handleLogin = async (req, res) => {
    errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: errors.array()
        })
    }
    const cookies = req.cookies;

    const { staffId, password } = req.body;

    if (!staffId || !password)
        return res.status(400).json({
            'message': 'StaffId and Password are required!'
        });

    const foundUser = await User.findOne(
        { staffId }
    );

    if (!foundUser)
        return (
            res.status(401).json({
                error: 'Incorrect Staff-Id or Password!!'
            })//Unathorized
        );

    //Evaluate Password
    const validatePassword = await bcrypt.compare(
        password, foundUser.password
    );

    if (validatePassword) {
        //Create JWTs

        const payload = {
            user: {
                id: foundUser.id
            }
        }

        const accessToken = jwt.sign(
            { "staffId": foundUser.staffId },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '10s' }
        );

        const newRefreshToken = jwt.sign(
            { "staffId": foundUser.staffId },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '15s' }
        );

        // Changed to let keyword
        let newRefreshTokenArray =
            !cookies?.jwt
                ? foundUser.refreshToken
                : foundUser.refreshToken.filter(rt => rt !== cookies.jwt);
        if (cookies?.jwt) {
            /*
            Scenario added here: 
                1) User logs in but never uses RT and does not logout 
                2) RT is stolen
                3) If 1 & 2, reuse detection is needed to clear all RTs when user logs in
            */

            const refreshToken = cookies.jwt;
            const foundToken = await User.user.findOne({ refreshToken });

            // Detected refresh token reuse!
            if (!foundToken) {
                // clear out ALL previous refresh tokens
                newRefreshTokenArray = [];
            }

            res.clearCookie(
                'jwt',
                {
                    httpOnly: true,
                    sameSite: 'None',
                    secure: true
                });

        }

        // Saving refreshToken with current user
        foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken];
        const result = await foundUser.save();

        // Creates Secure Cookie with refresh token
        res.cookie(
            'jwt',
            newRefreshToken,
            {
                httpOnly: true,
                secure: true,
                sameSite: 'None', 
                maxAge: 24 * 60 * 60 * 1000
            });

        // res.status(200).json({
        res.json({
            'success': `StaffId ${staffId} is Logged in!`,
            accessToken,
            image: foundUser.imageUrl
        });
    }
    else {
        return (
            res.status(401).json({
                error: 'Incorrect Staff-Id or Password!'
            })//Unathorized
        );
    }
    try {
        console.log("Successfully Loggedin");
    } catch (e) { // Missing this
        console.error(e);
    }
}

module.exports = { handleLogin };
