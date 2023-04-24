const mongoose = require('mongoose');

const PayrollSchema = mongoose.Schema({
      staffId: {
            type: String,
            required: true
      },
      date: [{
            month: {
                  type: Number,
                  required: true
            },
            year: {
                  type: Number,
                  required: true
            },
            day: {
                  type: Number,
                  required: true
            },
            transportAllowance: {
                  type: Number,
            },
            salaryAdvance: {
                  type: Number,
            }
      }]
});

PayrollSchema.statics.updatePayroll = async function (staffId, month, year, day, transportAllowance, salaryAdvance) {
      const payroll = await this.findOne({ staffId: staffId });
      const payrollDate = payroll.date.find((date) => date.month === month && date.year === year && date.day === day);

      if (payrollDate) {
            await this.updateOne(
                  { staffId: staffId, 'date.day': day, 'date.month': month, 'date.year': year },
                  { $inc: { 'date.$.transportAllowance': transportAllowance, 'date.$.salaryAdvance': salaryAdvance } }
            );
      } else {
            await this.updateOne(
                  { staffId: staffId },
                  { $push: { date: { month: month, year: year, day: day, transportAllowance: transportAllowance, salaryAdvance: salaryAdvance } } }
            );
      }
}


module.exports = mongoose.model('payroll', PayrollSchema);