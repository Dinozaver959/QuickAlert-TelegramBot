
export type Address = string & { readonly __brand: unique symbol };

const addressRegex = /^0x[a-fA-F0-9]{40}$/;

function isAddress(address: string): address is Address {
  return addressRegex.test(address);
}




export type TokenDetails = {
  tokenAddress: Address,
  tokenName: string,
  tokenSymbol: string,
  tokenDecimals: number,
  tokenValueDecFormatted: string
};







// SQL Database Types


export type WalletsRow_only_WA = {
  wallet_address: Address;
  // Add other fields if your table has more columns
};

export type Wallets_only_WA_Callback = (rows: WalletsRow_only_WA[] | null) => void;




export type WalletsRow_only_GI = {
  group_id: number;
  // Add other fields if your table has more columns
};

export type WalletsRow_only_GI_Callback = (rows: WalletsRow_only_GI[] | null) => void;



