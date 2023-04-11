require('dotenv').config()
const express = require('express')
const functions = require("firebase-functions")
const app = express()
const mongoose = require('mongoose')
const bodyParser = require('body-parser');
const cors = require('cors');

//Not known yet but needed for mobile
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())

const PORT = process.env.PORT || 8081;

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
            console.log('Connected to MongoDb...');
      } catch (error) {
            console.log("Can't connect to MongoDb");
            console.error(error.message);
            process.exit(1);
      }
})()

//Routes
const authRoute = require('./routes/authSignin')
const authMobile = require('./routes/auth');
const usersRoute = require('./routes/users')
const attendanceRoute = require('./routes/attendance');
const siteRoute = require('./routes/sites');

//Middleware
app.use(express.json())

//Route Middleware
app.use('/api/v1', authRoute)
app.use('/api/v1/auth', authMobile);
app.use('/api/v1/users', usersRoute)
app.use('/api/v1/attendance', attendanceRoute);
app.use('/api/v1/sites', siteRoute);

//Backend server 
const server = require('http').createServer(app);

server.listen(PORT, () =>
      console.log(`Server running on port ${PORT}`)
)

// exports.api = functions.https.onRequest(app);