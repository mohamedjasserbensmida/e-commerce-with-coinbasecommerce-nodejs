const {config} = require('dotenv');

config();   

const COINBASE_API_KEY= "10c6c6a7-7ed5-4c9e-8c47-69ac08b5ea0b";
const COINBASE_WEBHOOK_SECRET="2059c865-5e75-49f4-b167-c1f5d77c1cee"
const DOMAIN = "http://localhost:3000"


module.exports = {
    COINBASE_API_KEY,
    COINBASE_WEBHOOK_SECRET,
    DOMAIN
}