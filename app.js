require('dotenv').config();
const app = require('express')();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 8081;

const auth = require('./routes/auth');
const user = require('./routes/users');
const attendance = require('./routes/attendance');
const site = require('./routes/sites');

//  Database connection


(async () => {
    try {
        await mongoose.connect(process.env.DB_URL, {
            //useMongoClient: true,
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // useCreateIndex: true,
            // useFindAndModify: false
        });
        console.log('MongoDB Connected...');
    } catch (error) {
        console.log("Can't connect to Db");
        console.error(error.message);
        process.exit(1);
    }
})();


// Define database routes
app.use('/api/v1/auth', auth);
app.use('/api/v1/users', user);
app.use('/api/v1/attendance', attendance);
app.use('/api/v1/sites', site);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));