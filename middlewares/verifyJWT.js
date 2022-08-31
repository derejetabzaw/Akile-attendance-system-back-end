require('dotenv').config()
const jwt = require('jsonwebtoken')
// Verify token 

module.exports = function (req, res, next) {
      //Format of TOKEN
      //Authorization: Bearer <access_token>
      const tokenHeader = req.header('Authorization')

      // let id = localStorage.getItem("token");
      // console.log(id);

      if (typeof tokenHeader === 'undefined') {
            return res
                  .status(403)
                  .send('Forbidden')
      }
      else {
            const bearerToken = tokenHeader.split(' ')
            const token = bearerToken[1]

            if (!token)
                  return res
                        .status(401)
                        .send('Access Denied')
            try {
                  const verified = jwt.verify(
                        token,
                        process.env.ACCESS_TOKEN_SECRET
                  )
                  req.user = verified
                  next()

            } catch (err) {
                  return res
                        .status(401)
                        .send('Invalid Token')
            }
      }
}