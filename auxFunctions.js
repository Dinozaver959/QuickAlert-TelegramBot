



function isValidEthereumAddress(address) {
    const regex = /^0x[a-fA-F0-9]{40}$/;
    return regex.test(address);
}


function customFormat(tokenAmount, tokenDecimals){

    const amountParts = tokenAmount.toString().split("e+");
    const tokenWrittenDecimals = parseInt(amountParts[1]);
    const amountBase = amountParts[0];
  
    if(tokenDecimals == tokenWrittenDecimals){
  
      return amountBase.split(".")[0]
  
    } else if (tokenDecimals > tokenWrittenDecimals){
  
      return 0; // definitely less than 1....
  
    } else {
  
      const decToAdd = tokenWrittenDecimals - tokenDecimals;
      const parts = amountBase.split(".");
  
      var semiReady = parts[0].concat(parts[1].slice(0, decToAdd))
  
      // need to add missing 0s
      while(semiReady.length < 1 + decToAdd){
        semiReady = semiReady.concat("0")
      }
  
      return semiReady;
    }
  
  }
  
  function AddCommasToNumericString(amount){
  
    var tokenAmount = amount
    var formattedToken = '';
  
    while (tokenAmount.length > 3){
   
      formattedToken = tokenAmount.slice(-3) + "," + formattedToken
      tokenAmount = tokenAmount.slice(0, -3)
    }
  
    formattedToken = (tokenAmount + "," + formattedToken).slice(0, -1)
  
    return formattedToken;
  
  }
  



module.exports = {
    isValidEthereumAddress,
    customFormat,
    AddCommasToNumericString
};
