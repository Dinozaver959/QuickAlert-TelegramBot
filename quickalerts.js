const axios = require("axios");
require("dotenv").config();
const {QUICK_ALERT_API_KEY} = process.env;



// function to update notification
async function updateNotification(addresses) {

    console.log("addresses:")
    console.log(addresses)

    var constructExpressionString = "(tx_from == '";

    for(let i = 0; i < addresses.length; i++){
        constructExpressionString = constructExpressionString.concat(addresses[i].wallet_address)
        
        if(i != addresses.length - 1){
            constructExpressionString = constructExpressionString.concat("' || tx_from == '")
        }
    }
    constructExpressionString = constructExpressionString.concat("')")
    
    console.log("expression string:")
    console.log(constructExpressionString.toString())

    // do the actual work to create the expression
    // const encodedExpression = btoa(`(tx_from == '${address}' || tx_from == '0xf0E7aeb16f733c5D2f356501E8DB3d4A24d46cD2')`);    // update logic later
    const encodedExpression = btoa(constructExpressionString)


    try {
        const notificationId = await getNotification(0);
        const destinationId = await getDestinationIdByName("wallet-tracking-test");
        
        console.log(`notificationId:    ${notificationId}`)
        console.log(`destinationId:     ${destinationId}`)

        const myHeaders = new Headers();
        myHeaders.append('accept', 'application/json');
        myHeaders.append('Content-Type', 'application/json');
        myHeaders.append('x-api-key', QUICK_ALERT_API_KEY);


        var requestOptions = {
        	method: 'PATCH',
        	headers: myHeaders,
        	redirect: 'follow',
        	body: JSON.stringify({
        		name: 'Wallet Tracking Goerli',
        		expression: encodedExpression,
        		network: 'ethereum-goerli',
        		destinationIds: [destinationId],
        	}),
        }

        return fetch(
            `https://api.quicknode.com/quickalerts/rest/v1/notifications/${notificationId}`,
            requestOptions
        )
        .then(response => response.text())
        .then(result => {
            console.log(result)
            return true;
        })
        .catch(error => {
            console.log('error', error)
            return false;
        })

    } catch (error) {
        console.log('error', error);
        return false;
    }

    
}


// functiuon to get destinationId
async function getDestinationIdByName(destinationName){

    var myHeaders = new Headers()
    myHeaders.append('accept', 'application/json')
    myHeaders.append('x-api-key', QUICK_ALERT_API_KEY)
    
    var requestOptions = {
    	method: 'GET',
    	headers: myHeaders,
    	redirect: 'follow',
    }
    
    try {
        const response = await fetch('https://api.quicknode.com/quickalerts/rest/v1/destinations', requestOptions);
        const jsonArray = await response.json();

        for (let obj of jsonArray) {
            if (obj.name === destinationName) {
                return obj.id;
            }
        }
        return "";
    } catch (error) {
        console.log('error', error);
        return "";
    }
}


// functiuon to get notifications
async function getNotification(index){

    var myHeaders = new Headers()
    myHeaders.append('accept', 'application/json')
    myHeaders.append('x-api-key', QUICK_ALERT_API_KEY)
    
    var requestOptions = {
    	method: 'GET',
    	headers: myHeaders,
    	redirect: 'follow',
    }
    
    try {
        const response = await fetch('https://api.quicknode.com/quickalerts/rest/v1/notifications', requestOptions);
        const jsonArray = await response.json();

        console.log(jsonArray)
        console.log(jsonArray.toString())

        if(jsonArray.length > index){
            return jsonArray[index].id;
        }
        else {
            return ""
        }

    } catch (error) {
        console.log('error', error);
        return "";
    }
}



module.exports = {
    getDestinationIdByName,
    updateNotification
};


