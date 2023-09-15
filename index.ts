

//  THIS FILE IS FOR THE NODE SERVER - RECEIVING QUICK ALERTS AND FORWARDING THEM TO TELEGRAM


import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import { BigNumber, ethers } from "ethers";
import TelegramBot from "node-telegram-bot-api";
import ERC20ABI from './ABIs/ERC20.json'
import { Address, TokenDetails } from "./customTypes";
import {getAllGroupsTrackingAWallet} from "./db";
import {customFormat, AddCommasToNumericString} from "./auxFunctions";

const TELEGRAM_BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN!;
const PORT: string = process.env.PORT!;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN)

const app = express();
app.use(express.json({limit: '50mb'}));   // need to increase the limit of payload for quicknode option 1 - block





// We are receiving updates at the route below!
app.post('/webhook', async (req: any, res: any) => {

  var buyBoolean: boolean = false;
  var tokenAmount: number = 0;
  var ethAmount: number = 0;
  var tokenDetails: TokenDetails = {
    tokenAddress: 'defaultAddress' as Address,
    tokenName: 'defaultName',
    tokenSymbol: 'defaultSymbol',
    tokenDecimals: 0,
    tokenValueDecFormatted: 'defaultValue'
};

  console.log(req.body)

  // gather data
  const webhook = req.body;
  const matchedTransactions = webhook.matchedTransactions;
  const matchedReceipts = webhook.matchedReceipts;
  const from = matchedTransactions[0].from.toLowerCase();
  const to = matchedTransactions[0].to.toLowerCase();
  const tx_hash = matchedTransactions[0].hash;
  const valueHex = matchedTransactions[0].value;
  const valueDex = BigNumber.from(valueHex);  //parseInt(valueHex);
  var ethValueDecFormatted: string;
  const minimumObservedETHTransfer: BigNumber = BigNumber.from(ethers.utils.parseEther("0.1"));

  // give feedback on the data received
  res.sendStatus(200);

  const chainId = parseInt(matchedTransactions[0].chainId);                                                                       // use this + create a function for the provider and for the scannerLink
  console.log(`chaindId:     ${chainId}`)

  const logs = matchedReceipts[0].logs;
  console.log(logs)

  // check that at least 1 log includes the swap - otherwise it might just be a simple transfer
  const allFunctionSignatures = [];
  for(let i = 0; i < logs.length; i++){
    allFunctionSignatures.push(logs[i].topics[0]);
  }

  if(!allFunctionSignatures.includes("0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822")){

    console.log("no swap detected... transfer maybe?")

    console.log(`logs length:                  ${logs.length}`)
    console.log(`valueDex:                     ${valueDex}`)
    console.log(`minimumObservedETHTransfer:   ${minimumObservedETHTransfer}`)
    if(logs.length == 0 && valueDex > minimumObservedETHTransfer){

      console.log("ETH transfer detected")

      // Send alerts for ETH transfered
      sendTelegramNotificationForTransferedETH(chainId, from, to, valueDex, tx_hash)
    } 

    // ADD ALERT FOR TRANSFER OF ERC20
    if(logs.length == 1 && logs[0].topics[0] == "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"){

      console.log("ERC20 transfer detected")

      tokenDetails = await getTokenDetails(chainId, logs[0].address, tokenAmount);

      // send alert for ERC20 transfer
      sendTelegramNotificationForTransferedERC20(chainId, from, to, tokenDetails, tx_hash)
    }

  } else {

    // Get ERC20 token contract + token details
    for(let i = 0; i < logs.length; i++){

      const functionSignature = logs[i].topics[0];

      if(functionSignature == "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"){ // transfer

        if(logs[i].address != getWrappedNativeToken(chainId)){ // WETH or wrapped native token
        
          tokenDetails = await getTokenDetails(chainId, logs[i].address, tokenAmount);
          break;
        }
      }

      // ABORT 
      if(i == (logs.length - 1) && tokenDetails.tokenDecimals == 0){
        console.log("something is not ok... there is no Token Transfer evet in logs with Swap event... ABORT")
        return -1;
      }
    }

    // get Swap details
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
        
        if(valueDex.gt(BigNumber.from(0))){
          // BUY
          buyBoolean = true;
          
          if(tokenDetails.tokenAddress < getWrappedNativeToken(chainId)){
            // ERC20 goes first
            tokenAmount = amount0Out;
            ethAmount = amount1In;
          } else {
            // ETH goes first
            tokenAmount = amount1Out;
            ethAmount = amount0In;
          }

        } else {
          // SELL
          buyBoolean = false;

          if(tokenDetails.tokenAddress < getWrappedNativeToken(chainId)){
            // ERC20 goes first
            tokenAmount = amount0In;
            ethAmount = amount1Out;
          } else {
            // ETH goes first
            tokenAmount = amount1In;
            ethAmount = amount0Out;
          }

        }

        console.log(`token amount:     ${tokenAmount}`)
        console.log(`eth amount:       ${ethAmount}`)

      } 

      // add more options - routers from kyberswap, 1inch, 0x etc....
      // checking the transfer event (WETH and token) - option 2 (should be universal across any router)
    }

    // we plan on cutting 12 digits off first...
    if(ethAmount.toString().length <= 12){
      // skip the telegram alerts... too small value
      console.log("ETH value too small to care...")
      console.log(`eth value:         ${ethers.utils.formatEther(ethAmount)} ETH`)

    } else {

      ethValueDecFormatted = ethers.utils.formatUnits(ethAmount.toString().slice(0,-12), 6)  // remove last 12 digits first - to overcome the overflow
      console.log(`ethValueDecFormatted:        ${ethValueDecFormatted}`)
      
      // TELEGRAM NOTIFICATION
      sendTelegramNotificationForTokenBuySell(chainId, from, buyBoolean, ethValueDecFormatted, tokenDetails, tx_hash)

      // PIPE contract address into the @ProficyPriceBot bot, make sure this bot is added to the group
      sendTelegramNotificationForContractPiping(from, tokenDetails.tokenAddress)

    }

    console.log("finished processing swap")
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Express server is listening on PORT: ${PORT}`);
});







function sendTelegramNotificationForTransferedETH(chainId: number, from: Address, to: Address, valueDex: BigNumber, tx_hash: string){

  const ethValueDecFormatted: string = ethers.utils.formatEther(valueDex);
  
  // get all the groups tracking this walet, then send a message to each of these groups
  console.log(`wallet obaserved:   ${from}`)
  getAllGroupsTrackingAWallet(from, (groups: any) => {

    console.log(`groups tracking the wallet:     ${groups}`)

    for(let i = 0; i < groups.length; i++){

      // Sends text to the each groupId
      bot.sendMessage(
        groups[i].group_id,
        `
        🤔️️️️️️ ETH TRANSFERED OUT 🤔️️️️️️
        
        FROM: ${from}
        TO:   ${to}

        ${ethValueDecFormatted} ETH

        <a href="${getScannerLink(chainId)}/tx/${tx_hash}/">tx link      </a>
        `,

        /*
          Tx: ${getScannerLink(chainId)}/tx/${tx_hash}
        */
        {
          disable_web_page_preview: true,
          parse_mode: "HTML"
        }
      );   

    }
  })
  
}


function sendTelegramNotificationForTransferedERC20(chainId: number, from: Address, to: Address, tokenDetails: TokenDetails, tx_hash: string){
  
  // get all the groups tracking this walet, then send a message to each of these groups
  console.log(`wallet obaserved:   ${from}`)
  getAllGroupsTrackingAWallet(from, (groups: any) => {

    console.log(`groups tracking the wallet:     ${groups}`)

    for(let i = 0; i < groups.length; i++){

      // Sends text to the each groupId
      bot.sendMessage(
        groups[i].group_id,
        `
        🤔️️️️️️ ERC20 TRANSFERED OUT 🤔️️️️️️
        
        FROM: ${from}
        TO:   ${to}

        <a href="${getScannerLink(chainId)}/tx/${tx_hash}/">tx link      </a>  ${tokenDetails.tokenAddress}

        <a href="${getScannerLink(chainId)}/address/${tokenDetails.tokenAddress}/">contract link</a>  ${tokenDetails.tokenAddress}
        `,

        /*
          ${tokenDetails.tokenValueDecFormatted} ${tokenDetails.tokenName}($${tokenDetails.tokenSymbol})\n

          token address: ${tokenDetails.tokenAddress} \n

          Tx: ${getScannerLink(chainId)}/tx/${tx_hash}
        */
        {
          disable_web_page_preview: true,
          parse_mode: "HTML"
        }
      );   

    }
  })
  
}


function sendTelegramNotificationForTokenBuySell(chainId: number, from: Address, buyBoolean: boolean, ethValueDecFormatted: string, tokenDetails: TokenDetails, tx_hash: string){

  // get all the groups tracking this walet, then send a message to each of these groups
  console.log(`wallet obaserved:   ${from}`)
  getAllGroupsTrackingAWallet(from, (groups: any) => {

    console.log(`groups tracking the wallet:     ${groups}`)

    for(let i = 0; i < groups.length; i++){

      // Sends text to the each groupId
      bot.sendMessage(
        groups[i].group_id,
        `
${buyBoolean ? "  🔥️️️️️️🔥️️️️️️🔥️️️️️️ TOKEN BUY 🔥️️️️️️🔥️️️️️️🔥️️️️️️" : "😭️️️️️️ TOKEN SELL 😭️️️️️️"}

${buyBoolean ? `BUYER: ${from}` : `SELLER: ${from}`}
${tokenDetails.tokenName}($${tokenDetails.tokenSymbol})

${ethValueDecFormatted} ETH
${tokenDetails.tokenValueDecFormatted} $${tokenDetails.tokenSymbol}

${tokenDetails.tokenAddress}
<a href="${getScannerLink(chainId)}/tx/${tx_hash}/">tx link</a> | <a href="${getScannerLink(chainId)}/address/${tokenDetails.tokenAddress}/">contract link</a> 
        `,

        /*
          Tx: ${getScannerLink(chainId)}/tx/${tx_hash} \n

          token address: ${tokenDetails.tokenAddress} \n
          ${getScannerLink(chainId)}/address/${tokenDetails.tokenAddress}
        */

        {
          disable_web_page_preview: true,
          parse_mode: "HTML"
        }
      );   

    }
  })
}

function sendTelegramNotificationForContractPiping(from: Address, tokenAddress: Address){

    // get all the groups tracking this walet, then send a message to each of these groups
    console.log(`wallet obaserved:   ${from}`)
    getAllGroupsTrackingAWallet(from, (groups: any) => {
  
      console.log(`groups tracking the wallet:     ${groups}`)
  
      for(let i = 0; i < groups.length; i++){
  
        // Sends text to the each groupId
        bot.sendMessage(
          groups[i].group_id,
          tokenAddress
        );   
  
      }
    })

}




async function getTokenDetails(chainId: number, tokenAddress: Address, tokenAmount: number){


  const provider = getProviderEVM(chainId);

  // can now also get the token ticker and other token stuff
  const tokenContract =  new ethers.Contract(tokenAddress, ERC20ABI, provider);
  const tokenName = await tokenContract.name();
  const tokenSymbol = await tokenContract.symbol();
  const tokenDecimals = parseInt(await tokenContract.decimals());
    
  //console.log(`tokenName:          ${tokenName}`)
  //console.log(`tokenSymbol:        ${tokenSymbol}`)
  //console.log(`tokenDecimals:      ${tokenDecimals}`)

  var tokenValueDecFormatted = customFormat(tokenAmount, tokenDecimals)
  console.log(`tokenValueDecFormatted:      ${tokenValueDecFormatted}`)
  tokenValueDecFormatted = AddCommasToNumericString(tokenValueDecFormatted)
  console.log(`tokenValueDecFormatted:      ${tokenValueDecFormatted}`)



  return {
    tokenAddress: tokenAddress,
    tokenName: tokenName,
    tokenSymbol: tokenSymbol,
    tokenDecimals: tokenDecimals,
    tokenValueDecFormatted: tokenValueDecFormatted
  }
    

} 


function getProviderEVM(chainId: number){

  switch(chainId){
    case 1:
      return new ethers.providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`)

    case 5:
      return new ethers.providers.JsonRpcProvider(`https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`);

    default: // mainnet
      return new ethers.providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`)
  }
}


function getScannerLink(chainId: number){
  switch(chainId){
    case 1:
      return "https://etherscan.io/"

    case 5:
      return "https://goerli.etherscan.io/"

    default: //mainnnet
    return "https://etherscan.io/"
  }
}


function getWrappedNativeToken(chainId: number){
  switch(chainId){
    case 1:
      return "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"

    case 5:
      return "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6"

    default: //mainnnet
    return "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
  }
}