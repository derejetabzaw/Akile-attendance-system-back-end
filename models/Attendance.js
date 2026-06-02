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
    },
    overtime :{
        type:Number
    },
    overtimeTwo:{
        type:Number
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    monthIdentifier: {
        type: String, // "YYYY-MM"
        index: true
    }
});

const moment = require('moment');
AttendanceSchema.pre('save', function (next) {
    if (this.date) {
        const parsed = moment(this.date, ["YYYY-MM-DD", "dddd, DD-MM-YYYY", "DD,MM,YYYY", "DD-MM-YYYY"]);
        if (parsed.isValid()) {
            this.monthIdentifier = parsed.format("YYYY-MM");
        } else {
            this.monthIdentifier = this.date.substring(0, 7);
        }
    }
    next();
});

module.exports = mongoose.model('attendance', AttendanceSchema);