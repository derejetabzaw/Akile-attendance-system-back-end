require('dotenv').config()
const router = require('express').Router()
const User = require('../models/User')
const { loginValidation } = require('../controller/validation')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

//Signin
router.post(
      '/signin',
      async (req, res) => {
            const { error } = loginValidation(req.body)
            if (error)
                  return res
                        .status(400)
                        .send(
                              error.details[0].message
                        )
            //Checking if staffId exists
            const user = await User.findOne({
                  staffId: req.body.staffId
            })
            if (!user)
                  return res
                        .status(400)
                        .send('StaffId not found!!!')
            //Checking if password exists
            const validPass = await bcrypt.compare(req.body.password, user.password)
            if (!validPass)
                  return res
                        .status(400)
                        .send('Invalid Password')
            //Token creation and assignment
            const token = jwt.sign(
                  { _id: user._id },
                  process.env.ACCESS_TOKEN_SECRET
            )
            res.header('authToken', token).send(token)
      }
)

module.exports = router