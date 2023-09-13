

//  THIS FILE IS FOR THE NODE SERVER - RECEIVING QUICK ALERTS AND FORWARDING THEM TO TELEGRAM



require("dotenv").config()
const express = require("express")
const ethers = require("ethers")
const TelegramBot = require("node-telegram-bot-api")
const ERC20ABI = require('./ABIs/ERC20.json')
const {TELEGRAM_BOT_TOKEN, PORT} = process.env
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN)
const {getDestinationIdByName, updateNotification} = require("./quickalerts")
const {getAllGroupsTrackingAWallet} = require("./db")
const {customFormat, AddCommasToNumericString} = require("./auxFunctions")


const app = express();
//app.use(express.json());
app.use(express.json({limit: '50mb'}));   // need to increase the limit of payload for quicknode option 1 - block



// We are receiving updates at the route below!
app.post('/webhook', async (req, res) => {

  var buyBoolean;
  var tokenAmount;
  var ethAmount;
  var tokenAddress;
  var tokenName;
  var tokenSymbol;
  var tokenDecimals;

  const providerETH = new ethers.providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`)
  const provider = new ethers.providers.JsonRpcProvider(`https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`)
  console.log(req.body)

  // gather data
  const webhook = req.body;
  const matchedTransactions = webhook.matchedTransactions;
  const matchedReceipts = webhook.matchedReceipts;
  const from = matchedTransactions[0].from;
  const to = matchedTransactions[0].to;
  var walletObserved;
  const tx_hash = matchedTransactions[0].hash;
  const valueHex = matchedTransactions[0].value;
  const valueDex = parseInt(valueHex);
  var ethValueDecFormatted;

  const logs = matchedReceipts[0].logs;
  console.log(logs)

  // check that at least 1 log includes the swap - otherwise it might just be a simple transfer
  const allFunctionSignatures = [];
  for(let i = 0; i < logs.length; i++){
    allFunctionSignatures.push(logs[i].topics[0]);
  }

  if(!allFunctionSignatures.includes("0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822")){
    // skip this Transaction...
    res.sendStatus(200);
    console.log("no swap detected... skipping this transaction")

  } else {

    // for all the logs...
    for(let i = 0; i < logs.length; i++){

      const functionSignature = logs[i].topics[0];

      // checking the swap event - option 1
      if(functionSignature == "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822"){   // uniswap execute Swap

        console.log("uniswap V2 swap...")

        const data = logs[i].data;
        
        const decodedData = ethers.utils.defaultAbiCoder.decode(
          ['uint256', 'uint256', 'uint256', 'uint256'],
          data
        )

        const amount0In = parseInt(decodedData[0])
        const amount1In = parseInt(decodedData[1])
        const amount0Out = parseInt(decodedData[2])
        const amount1Out = parseInt(decodedData[3])
        
        if(valueDex != 0){
          // BUY
          buyBoolean = true;
          // assume it is TOKEN-ETH
          tokenAmount = amount0Out;
          ethAmount = amount1In;
        } else {
          // SELL
          buyBoolean = false;
          // assume it is TOKEN-ETH
          tokenAmount = amount0In;
          ethAmount = amount1Out;
        }

        console.log(`token amount:     ${tokenAmount}`)
        console.log(`eth amount:       ${ethAmount}`)

      } // add more options - routers from kyberswap, 1inch, 0x etc....
      // checking the transfer event (WETH and token) - option 2 (should be universal across any router)
      else if(functionSignature == "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"){

        const address = logs[i].address;

        if(address != "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6"){  // WETH on Goerli - adjust as needed based on the chain
        
          //console.log("Transfer event occurred...")
          tokenAddress = address;

          // can now also get the token ticker and other token stuff
          const tokenContract =  new ethers.Contract(tokenAddress, ERC20ABI, provider);
          tokenName = await tokenContract.name();
          tokenSymbol = await tokenContract.symbol();
          tokenDecimals = parseInt(await tokenContract.decimals());
          
          //console.log(`tokenName:          ${tokenName}`)
          //console.log(`tokenSymbol:        ${tokenSymbol}`)
          //console.log(`tokenDecimals:      ${tokenDecimals}`)
        }

      }
    }
    

    // give feedback on the data received
    res.sendStatus(200);
    console.log("input ok")


    // we plan on cutting 12 digits off first...
    if(ethAmount.toString().length <= 12){
      // skip the telegram alerts... too small value
      console.log("ETH value too small to care...")
      console.log(`eth value:         ${ethers.utils.formatEther(ethAmount)} ETH`)

    } else {

      ethValueDecFormatted = ethers.utils.formatUnits(ethAmount.toString().slice(0,-12), 6)  // remove last 12 digits first - to overcome the overflow
      //console.log(`ethValueDecFormatted:        ${ethValueDecFormatted}`)
      var tokenValueDecFormatted = customFormat(tokenAmount, tokenDecimals)
      //console.log(`tokenValueDecFormatted:      ${tokenValueDecFormatted}`)
      tokenValueDecFormatted = AddCommasToNumericString(tokenValueDecFormatted)
      //console.log(`tokenValueDecFormatted:      ${tokenValueDecFormatted}`)



      // TELEGRAM NOTIFICATION
      
      // get all the groups tracking this walet, then send a message to each of these groups
      walletObserved = (buyBoolean ?  from : to).toLowerCase();
      getAllGroupsTrackingAWallet(walletObserved.trim(), (groups) => {

        //console.log(groups)

        for(let i = 0; i < groups.length; i++){

          // Sends text to the each groupId
          bot.sendMessage(groups[i].group_id,
            `
            ${buyBoolean ? "  🔥️️️️️️🔥️️️️️️🔥️️️️️️ TOKEN BUY 🔥️️️️️️🔥️️️️️️🔥️️️️️️" : "😭️️️️️️ TOKEN SELL 😭️️️️️️"}

            ${buyBoolean ? `BUYER: ${from}` : `SELLER: ${to}`}

            ${tokenName}($${tokenSymbol})\n
            ${ethValueDecFormatted} ETH
            ${tokenValueDecFormatted} $${tokenSymbol} \n

            Tx: https://goerli.etherscan.io/tx/${tx_hash} \n
            token address: ${tokenAddress} \n
            https://goerli.etherscan.io/address/${tokenAddress}
            `
          );   

        }
      })
    }
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Express server is listening on PORT: ${PORT}`);
});






