const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');
const User = require('./models/User');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.DB_URL);
        console.log('Connected to DB...');

        const records = await Attendance.find({ date: { $regex: /^2026-05/ } }).populate('user').lean();
        console.log(`Found ${records.length} records in May 2026:\n`);

        records.forEach((r, idx) => {
            console.log(`${idx + 1}. User: ${r.user ? r.user.name + ' ' + r.user.lastName : 'Unknown'} (${r.user ? r.user.staffId : 'no-user'})`);
            console.log(`   Date: ${r.date}, In: ${r.checkInTime}, Out: ${r.checkOutTime}`);
            console.log(`   WorkedHours: ${r.workedHours}, Overtime: ${r.overtime}, OvertimeTwo: ${r.overtimeTwo}`);
            console.log(`   isApproved: ${r.isApproved}, monthIdentifier: ${r.monthIdentifier}\n`);
        });

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

run();
