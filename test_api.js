const axios = require('axios');

(async () => {
    try {
        const res = await axios.get('http://localhost:9000/api/v1/leave', {
            headers: { Authorization: 'Bearer DEBUG-BYPASS-TOKEN' }
        });
        console.log("Leaves API response:");
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("API error:");
        if (e.response) {
            console.error(e.response.status, e.response.data);
        } else {
            console.error(e.message);
        }
    }
})();
