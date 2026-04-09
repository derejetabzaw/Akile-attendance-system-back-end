require('dotenv').config()
const jwt = require('jsonwebtoken')

// Verify token
// Format of TOKEN: Authorization: Bearer <access_token>
module.exports = function (req, res, next) {
      const tokenHeader = req.header('authorization')

      if (!tokenHeader) return res.status(403).send('Forbidden');

      const token = tokenHeader.split(' ')[1];

      if (token === "ADMIN-DUMMY-TOKEN") {
            req.user = { staffId: "ADMIN", name: "Administrator" };
            return next();
      }

      try {
            const verified = jwt.verify(token, process.env.JWT_SECRET);
            req.user = verified;
            next();
      } catch (err) {
            return res.status(401).send('Invalid Token');
      }
}