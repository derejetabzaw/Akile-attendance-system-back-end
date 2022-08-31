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
            const validatePassword = await bcrypt.compare(
                  req.body.password,
                  user.password
            )

            if (!validatePassword)
                  return res
                        .status(401)
                        .send('Incorrect Staff-Id or Password')

            //Token creation and assignment
            try {
                  jwt.sign(
                        { _id: user.id },
                        process.env.ACCESS_TOKEN_SECRET,
                        //expiresIn time should be agreed upon within the team 
                        { expiresIn: '6h' },
                        (err, token) => {
                              if (err)
                                    throw err
                              return res
                                    .header(
                                          'authorization',
                                          token
                                    )
                                    .status(200)
                                    .json({
                                          accessToken: token,
                                          staffId: user.staffId,
                                    }
                                    )
                        }
                  )
            }
            catch (error) {
                  return res
                        .status(500)
                        .json({ message: 'Server error' })
            }
      }
)

module.exports = router