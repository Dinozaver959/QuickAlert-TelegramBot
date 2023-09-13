import {updateDestionationWebhook} from "./quickalerts";


async function main(){

    await updateDestionationWebhook("wallet-tracking-test-2", "https://f53a-87-200-88-192.ngrok-free.app/webhook");

}


main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
  
  