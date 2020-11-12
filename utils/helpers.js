const moment = require('moment');

const calculateTotalHours = (checkInTime, checkOutTime) => {
    let checkIn = moment(checkInTime, '"HH:mm:ss"')
    let checkOut = moment(checkOutTime, "HH:mm:ss")
    const total = checkOut.diff(checkIn, 'hours', true)
    return total
}

module.exports = {
    calculateTotalHours
}