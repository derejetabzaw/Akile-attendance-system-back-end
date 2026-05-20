const mongoose = require('mongoose');
require('dotenv').config();

const DB_URL = "mongodb+srv://dereje:akillepassword@akille-demo.pk4f8zj.mongodb.net/test?retryWrites=true&w=majority";

(async () => {
    try {
        await mongoose.connect(DB_URL);
        console.log('Connected to DB');
        
        const User = require('./models/User');
        const users = await User.find({}, 'name lastName email position staffId');
        console.log('Users in DB:');
        console.table(users.map(u => ({
            name: u.name + ' ' + (u.lastName || ''),
            email: u.email,
            staffId: u.staffId,
            position: u.position
        })));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
