const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    staffId: {
        type: String,
        required: true
    },
    deviceId: {
        type: String,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    }
});

module.exports = mongoose.model('user', UserSchema);