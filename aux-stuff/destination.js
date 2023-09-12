const axios = require("axios");
require("dotenv").config();

let data = JSON.stringify({
    "name": "webhooktesttxt_api",
    "to_url": " https://71b9-87-200-88-192.ngrok-free.app/webhook",              // need to update this based on the server + run the script as instructed below, then update the notification with the output
    "webhook_type": "POST",
    "service": "webhook",
    "payload_type": 7
});

let config = {
    method: "post",
    url: "https://api.quicknode.com/quickalerts/rest/v1/destinations",
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



// run this with:    node destination
// then use the output for the notification in the destinationIds


// this is to create a destination....