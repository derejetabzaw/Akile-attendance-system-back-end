const moment = require('moment');
// const moment_ethiopian = require('moment-ethiopian');
const calculateTotalHours = (checkInTime, checkOutTime , day , date) => {
    let checkIn = moment(checkInTime, "HH:mm:ss")
    let checkOut = moment(checkOutTime, "HH:mm:ss")
    let theDay = moment(day,"dddd")
    let theDate = moment(date,"DD,MM,YYYY")
    var holiday_found = 'No'
    const holidays_2013 = ["07,01,2021","19,01,2021", "02,03,2021" , 
    "30,04,2021","01,05,2021","02,05,2021",
    "05,05,2021","13,05,2021","28,05,2021",
    "20,07,2021","11,09,2021"]

    for (var i=0; i < holidays_2013.length; i++){
        if (theDate === holidays_2013[i]){
            holiday_found = 'Yes'
            break
        }else{
            //pass 
        }
    }
    

    const total = checkOut.diff(checkIn, 'hours', true)
    console.log("total: ", total)
    
    var normaloverTimehours = total - 8

    if (theDay =='Sunday' || (holiday_found === 'Yes') ){
        if(total > 8){
            var normalOverTimehours = total - 8
            var sundayOverTimehours = 8
        }else{
            sundayOverTimehours = total
            normalOverTimehours = 0
            console.log('No normal Over Time Recorded on a Sunday');
        }
    }else{
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