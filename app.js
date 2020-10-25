const dotenv = require('dotenv').config();
const app = require('express')();
const bodyParser = require('body-parser');
const cors = require('cors');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors());




app.listen(PORT, () => console.log(`Server running on port ${PORT}`));