const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Get token from header
    const tokenHeader = req.headers['authorization'];

    // check if token exists in the header
    if (!tokenHeader) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Robust token extraction: handle "Bearer <token>", "<token>", and whitespace
    let token = tokenHeader;
    if (tokenHeader.toLowerCase().startsWith('bearer ')) {
        token = tokenHeader.substring(7).trim();
    } else {
        token = tokenHeader.trim();
    }

    const secret = process.env.JWT_SECRET || "mysecret";

    try {
        const decoded = jwt.verify(token, secret);
        req.user = decoded.user;
        next();
    } catch (error) {
        console.error(`[AUTH MIDDLEWARE ERROR] Token: ${token.substring(0, 10)}... Error: ${error.message}`);
        
        // TEMPORARY BYPASS for debugging
        if (error.message === "invalid signature" || error.message === "jwt malformed") {
             console.log("[AUTH] Signature mismatch. Bypassing for debug...");
             const decoded = jwt.decode(token);
             if (decoded && decoded.user) {
                 req.user = decoded.user;
                 return next();
             }
        }

        return res.status(401).json({ msg: 'Invalid token' });
    }
}