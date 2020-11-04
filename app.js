const dotenv = require('dotenv').config();
const app = require('express')();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 8081;

const user = require('./routes/users');
const auth = require('./routes/auth');

//  Database connection
(async () => {
    try {
        await mongoose.connect(process.env.LOCAL_DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false
        });
        console.log('MongoDB Connected...');
    } catch (error) {
        console.log("Can't connect to Db");
        console.error(error.message);
        process.exit(1);
    }
})();


// Define database routes
app.use('/api/v1/users', user);
app.use('/api/v1/auth', auth);


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));