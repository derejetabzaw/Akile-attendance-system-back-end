const moment = require('moment');

/**
 * Basic Ethiopian Holiday Helper
 * Note: Ethiopian holidays vary by year. This list contains fixed-date 
 * or common public holidays for the current Gregorian context.
 */
const ETHIOPIAN_HOLIDAYS = [
  '09-11', // Enkutatash (New Year) - Sep 11
  '09-12', // Enkutatash (Leap year)
  '09-27', // Meskel - Sep 27
  '01-07', // Genna (Christmas) - Jan 7
  '01-19', // Timket (Epiphany) - Jan 19
  '03-02', // Adwa Victory Day - Mar 2
  '05-01', // International Labour Day - May 1
  '05-05', // Patriots' Victory Day - May 5
  '05-28', // Derg Downfall Day - May 28
];

/**
 * Checks if a given date string (YYYY-MM-DD) is a weekend or holiday
 * @param {string} dateStr 
 * @returns {boolean}
 */
function isWeekendOrHoliday(dateStr) {
  const m = moment(dateStr);
  const day = m.day(); // 0 = Sunday, 6 = Saturday
  
  // Weekend (Saturday or Sunday)
  if (day === 0 || day === 6) return true;
  
  // Holiday (MM-DD check)
  const monthDay = m.format('MM-DD');
  if (ETHIOPIAN_HOLIDAYS.includes(monthDay)) return true;
  
  return false;
}

/**
 * Calculates OT1 and OT2 based on worked hours, date, and previous hours worked today
 * @param {number} sessionHours 
 * @param {string} dateStr 
 * @param {number} previousHours - (Optional) Hours already worked today
 * @returns {object} { workHours, ot1, ot2 }
 */
function calculateOvertime(sessionHours, dateStr, previousHours = 0) {
  let workHours = 0;
  let ot1 = 0;
  let ot2 = 0;

  if (isWeekendOrHoliday(dateStr)) {
    // Everything on weekend/holiday is OT2
    ot2 = sessionHours;
  } else {
    // Normal day: calculate how much of the current session goes into the 8-hour bucket
    const totalDailySoFar = previousHours;
    const remainingRegularHours = Math.max(0, 8 - totalDailySoFar);
    
    if (sessionHours > remainingRegularHours) {
      workHours = remainingRegularHours;
      ot1 = sessionHours - remainingRegularHours;
    } else {
      workHours = sessionHours;
    }
  }

  return {
    workHours: parseFloat(workHours.toFixed(2)),
    ot1: parseFloat(ot1.toFixed(2)),
    ot2: parseFloat(ot2.toFixed(2))
  };
}

module.exports = {
  isWeekendOrHoliday,
  calculateOvertime
};
