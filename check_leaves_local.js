const mongoose = require('mongoose');
require('dotenv').config();

const DB_URL = process.env.DB_URL || "mongodb://localhost:27017/akile_test_db_4";

(async () => {
    try {
        await mongoose.connect(DB_URL);
        console.log('Connected to DB');
        
        const User = require('./models/User'); // Need this to register 'user'
        const Leave = require('./models/Leave');
        const leaves = await Leave.find({}).populate('user');
        console.log('Leaves in DB:');
        console.log(JSON.stringify(leaves, null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
