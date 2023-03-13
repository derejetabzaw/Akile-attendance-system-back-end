

const moment = require('moment');
const { response } = require('express');
// const { default: fetch } = require('node-fetch');
const { default: axios } = require('axios');

function checkHoliday(input) {
    var h=false;
    var url = 'https://www.googleapis.com/calendar/v3/calendars/en.et%23holiday%40group.v.calendar.google.com/events?key=AIzaSyCshWk0iM3lXBDFTMrjQgQmQffb2HzipxA'
    axios.get(url)
    .then(response => {
for(var i=0;i<response.data.items.length;i++){
    
    if (  new Date(response.data.items[i].start.date).toString().substring(0,15).localeCompare (input.toString().substring(0,15)) ) 

        h=true;}
 return h;
    })
    .catch(err => { throw err });}
  
const calculateTotalHours = (checkInTime, checkOutTime , day , date) => {
    let checkIn = moment(checkInTime, "HH:mm:ss")
    let checkOut = moment(checkOutTime, "HH:mm:ss")
   let theDay = moment(day,"dddd")
    let theDate = moment(date,"DD,MM,YYYY")

  
    
const total = checkOut.diff(checkIn, 'hours', true)
    console.log("total: ", total)
    
    
    var normaloverTimehours = total - 8

    if (theDay.toString().substring(0,4).localeCompare ('Sun')===true )  {
        if(total > 8){
            var normalOverTimehours = total - 8
            var sundayOverTimehours = 8;
            

        }else{
            sundayOverTimehours = total
            normalOverTimehours = 0
            console.log('No normal Over Time Recorded on a Sunday');
            
           
        }
    }
    else if((checkHoliday(theDate)==true)){


        if(total > 8){
            var normalOverTimehours = total ;
            var sundayOverTimehours = 0;
            

        }else{
            sundayOverTimehours = 0;
            normalOverTimehours = total;
            console.log('today is a holiday');
            
           
        }



            }      
            
            else{
        sundayOverTimehours = 0
        if(total > 8){
            normalOverTimehours = total - 8
            total = 8
    
        }else{
            normalOverTimehours = 0
            console.log('No Over Time Recorded');
        }
    

    }
    
   

    
    return [total,normalOverTimehours, sundayOverTimehours]
}



module.exports = {
    calculateTotalHours
}