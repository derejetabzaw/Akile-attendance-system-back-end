const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Get token from header
    const token = req.headers['authorization'];

    // check if token exists in the header
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        jwt.verify(
            token,
            process.env.JWT_SECRET,
            (error, decoded) => {
                if (error) {
                    return res.status(401).json({ msg: 'Invalid token' });
                } else {
                    req.user = decoded.user;
                    next();
                }

            }
        )
    } catch (error) {
        console.log("something went wrong");
        return res.status(500).json({ msg: 'Server error' });
    }
}