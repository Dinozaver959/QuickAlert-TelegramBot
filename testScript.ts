import {updateDestionationWebhook} from "./quickalerts";


async function main(){

    await updateDestionationWebhook("wallet-tracking-test-2", "https://funky-hippo-gently.ngrok-free.app/webhook");

}


main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
  
  