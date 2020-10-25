const mongoose  = require('mongoose');

const AttendanceSchema = mongoose.Schema({
    user: {
        type: mongoose.Types.Array,
        ref: 'user'
    },
    date: {
        type: Date,
        default: Date.now()
    },
    checkInTime: {
        type: Date,
        default: Date.now()
    },
    checkOutTime: {
        type: Date,
        default: Date.now()
    }
});

module.exports = mongoose.model('attendance', AttendanceSchema);