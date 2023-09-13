
import axios from "axios";
import * as dotenv from "dotenv";
import { Address } from "./customTypes";
dotenv.config();
const QUICK_ALERT_API_KEY: string = process.env.QUICK_ALERT_API_KEY!;




// update notification
export async function updateNotification(addresses: any) {

    console.log("addresses tp trackl:")
    console.log(addresses)

    var constructExpressionString = "(tx_from == '";

    for(let i = 0; i < addresses.length; i++){
        constructExpressionString = constructExpressionString.concat(addresses[i].wallet_address)
        
        if(i != addresses.length - 1){
            constructExpressionString = constructExpressionString.concat("' || tx_from == '")
        }
    }
    constructExpressionString = constructExpressionString.concat("')")
    
    //console.log("expression string:")
    //console.log(constructExpressionString.toString())

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


        var requestOptions: RequestInit = {
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
            //console.log(result)
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

// update destination's webhook endpoint (when we run ngrok and get a new link)
export async function updateDestionationWebhook(destinationName: string, newWebhookUrl: string){
    // there is no update API, so what we have to do is first delete the old destination that has the same name and then create a new destination

    // get id of the destinationName
    // if it exists -> delete -> create new 
    // if it does not exist -> create new


    const destinationId = await getDestinationIdByName(destinationName);
    console.log(`destinationId:     ${destinationId}`)

    if(destinationId != ""){
        // delete current destination first
        var myHeaders = new Headers()
        myHeaders.append('accept', 'application/json')
        myHeaders.append('x-api-key', QUICK_ALERT_API_KEY)
        
        var requestOptions: RequestInit = {
            method: 'DELETE',
            headers: myHeaders,
            redirect: 'follow',
        }
        
        try {
            fetch(`https://api.quicknode.com/quickalerts/rest/v1/destinations/${destinationId}`, requestOptions)
            .then(response => response.text())
            .then(result => console.log(result))
            .catch(error => console.log('error', error))

        } catch (error) {
            console.log("failed to delete current destination")
            console.log('error', error);
            return false;
        }
    }

    /*
    // create new destination
    try {
        const myHeaders = new Headers();
        myHeaders.append('accept', 'application/json');
        myHeaders.append('Content-Type', 'application/json');
        myHeaders.append('x-api-key', QUICK_ALERT_API_KEY);

        var requestOptions: RequestInit = {
        	method: 'POST',
        	headers: myHeaders,
        	redirect: 'follow',
            body: JSON.stringify({
                name: destinationName,
                to_url: newWebhookUrl,
                webhook_type: 'POST',
                service: 'webhook',
                payload_type: 7,
            }),
        }

        return fetch(
            `https://api.quicknode.com/quickalerts/rest/v1/destinations`,
            requestOptions
        )
        .then(response => response.text())
        .then(result => {
            //console.log(result)
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
    */
    
}

// get destinationId
export async function getDestinationIdByName(destinationName: string){

    var myHeaders = new Headers()
    myHeaders.append('accept', 'application/json')
    myHeaders.append('x-api-key', QUICK_ALERT_API_KEY)
    
    var requestOptions: RequestInit = {
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


// get notifications
export async function getNotification(index: number){

    var myHeaders = new Headers()
    myHeaders.append('accept', 'application/json')
    myHeaders.append('x-api-key', QUICK_ALERT_API_KEY)
    
    var requestOptions: RequestInit = {
    	method: 'GET',
    	headers: myHeaders,
    	redirect: 'follow',
    }
    
    try {
        const response = await fetch('https://api.quicknode.com/quickalerts/rest/v1/notifications', requestOptions);
        const jsonArray = await response.json();

        //console.log(jsonArray)
        //console.log(jsonArray.toString())

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


/*
module.exports = {
    getDestinationIdByName,
    getNotification,
    updateNotification,
    updateDestionationWebhook
};
*/

