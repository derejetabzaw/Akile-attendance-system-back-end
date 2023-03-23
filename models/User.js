const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    staffId: {
        type: String,
        required: true,
        // unique: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    deviceId: {
        type: String,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    gender: {
        type: String,
        required: true
    },
    position: {
        type: String
    },
    workingSite: {
        type: String,
    },
    image: {
        data: Buffer,
        contentType: String
    },
    imageUrl: {
        type: String
    },
    salary: {
        type: String,
        required: true
    },
    telephone: {
        type:String,
    }
});

module.exports = mongoose.model('user', UserSchema);