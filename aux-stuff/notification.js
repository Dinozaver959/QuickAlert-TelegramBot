const axios = require("axios");
require("dotenv").config();


let data = JSON.stringify({
    "name": "Notification via cli",
    "expression": "",
    "network": "ethereum-goerli",
    "destinationInds": [
        "1b3fba92-be1e-43b2-8a8b-895cdc69a5ac" // obtained from running the destination.js script
    ]
});

let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://api.quicknode.com/quickalerts/rest/v1/notifications",
    headers: {
        "accept": "*/*",
        "Content-Type": "application/json",
        "x-api-key": process.env.QUICK_ALERT_API_KEY
    },
    data: data
};

axios.request(config)
.then((response) => {
    console.log(JSON.stringify(response.data.id));
})
.catch((error) => {
    console.log(error);
});



// change this to be an exportable function 