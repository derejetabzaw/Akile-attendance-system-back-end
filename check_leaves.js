const mongoose = require('mongoose');
require('dotenv').config();

const DB_URL = "mongodb+srv://dereje:akillepassword@akille-demo.pk4f8zj.mongodb.net/test?retryWrites=true&w=majority";

(async () => {
    try {
        await mongoose.connect(DB_URL);
        console.log('Connected to DB');
        
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
