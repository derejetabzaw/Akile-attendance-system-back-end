//import fetch from "node-fetch";
const axios = require('axios') //add this line, this imports the axios functionalities into your code

const http = axios.create({
  headers: {'Cache-Control': 'no-cache'}
});
var url = 'https://www.googleapis.com/calendar/v3/calendars/en.et%23holiday%40group.v.calendar.google.com/events?key=AIzaSyCshWk0iM3lXBDFTMrjQgQmQffb2HzipxA'
// var input = prompt("What's the date? (Ex. 2023-01-19)");
var input = "2023-01-19"

axios(url)
.then(response )
.then(out => {
    out.items.forEach(element => {
        if (element.start.date === input) 
            console.log("It's a holiday!")
    });
})
.catch(err => { throw err })


