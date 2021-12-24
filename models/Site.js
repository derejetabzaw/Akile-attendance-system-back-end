const mongoose = require('mongoose');

const SiteSchema = new mongoose.Schema({
    sitename: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    latitude: {
        type: String,
        required: true
    },
    longitude: {
        type: String,
        required: true
    },
    sitemanager: {
        type: String,
    },
    paintarea: {
        type: String,
        required: true
        
    }
});

module.exports = mongoose.model('site', SiteSchema);