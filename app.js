const dotenv = require('dotenv').config();
const app = require('express')();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 8081;
//  Database connection
(async () => {
    try {
        await mongoose.connect(process.env.DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false
        });
        console.log('MongoDB Connected...');
    } catch(error){
        console.log("Can't connect to Db");
        console.error(error.message);
        process.exit(1);
    }
})();


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));