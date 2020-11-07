const mongoose  = require('mongoose');

const AttendanceSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    date: {
        type: String,
    },
    checkInTime: {
        type: String,
    },
    checkOutTime: {
        type: String,
    }
});

module.exports = mongoose.model('attendance', AttendanceSchema);