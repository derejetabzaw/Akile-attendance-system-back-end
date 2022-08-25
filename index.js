require('dotenv').config()
const express = require('express')
const app = express()
const mongoose = require('mongoose')

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
const usersRoute = require('./routes/users')
const attendanceRoute = require('./routes/attendance');
const siteRoute = require('./routes/sites');

//Middleware
app.use(express.json())

//Route Middleware
app.use('/api/v1', authRoute)
app.use('/api/v1/users', usersRoute)
app.use('/api/v1/attendance', attendanceRoute);
app.use('/api/v1/sites', siteRoute);


app.listen(PORT, () =>
      console.log(`Server running on port ${PORT}`)
)