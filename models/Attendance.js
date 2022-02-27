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
    },
    numberOfCheckIn:{
        type: Number,
    },
    workedHours: {
        type: Number
    }
});

module.exports = mongoose.model('attendance', AttendanceSchema);