const mongoose  = require('mongoose');

const EntranceSchema = mongoose.Schema({
    entryTime: {
        type: Date
    },
    exitTime: {
        type: Date
    }
});

module.exports = mongoose.model('entrance', EntranceSchema);