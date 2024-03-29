
//    THIS FILE IS FOR BOT SERVER - ALLOWING USERS TO INTERACT WITH THE BOT AND CUSTOMIZE IT

import dotenv from 'dotenv';
dotenv.config();
import TelegramBot from 'node-telegram-bot-api';
import { 
    initializeDatabase, 
    addWalletToTrack, 
    removeWalletFromTracking, 
    getAllWallets, 
    getAllWalletsOfAGroup, 
    getAllFromTable, 
    checkIfGroupTracksWallet 
} from './db';
import { isValidEthereumAddress } from './auxFunctions';
import { updateNotification } from './quickalerts';

const TELEGRAM_BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN!;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });




initializeDatabase();

bot.onText(/\/start/, (msg: any) => {
    bot.sendMessage
    (
        msg.chat.id, 
        `Welcome! Use following commands to configure wallet tracking \n/addwallet <address> \n/removewallet <address> \n/allwallets`
    );
});

bot.onText(/\/addwallet/, (msg: any) => {

    console.log(msg)
    const textParts = msg.text.split(" ");

    if(textParts[1] && textParts[1].length > 0){
        const walletAddress = textParts[1].toLowerCase();
        console.log(walletAddress)
    
        if(!isValidEthereumAddress(walletAddress)){
            bot.sendMessage(msg.chat.id, "Invalid ethereum address!\nFormat:  /addwallet <address>");
        } else {
    
            // check if this group already tracks the wallet
            checkIfGroupTracksWallet(msg.chat.id, walletAddress, (alreadyTracks) => {
    
                if(alreadyTracks){
                    bot.sendMessage(msg.chat.id, `already tracking this wallet`);
                } else {
    
                    addWalletToTrack(walletAddress, msg.from.id, msg.chat.id, () => {
                        console.log(`${walletAddress} added to DB`);
                        bot.sendMessage(msg.chat.id, `${walletAddress} added to DB`);
    
                        getAllWallets((wallets) => {
    
                            updateNotification(wallets).then(updateStatus => {
                                if (updateStatus) {
                                    bot.sendMessage(msg.chat.id, `${walletAddress} will now be tracked`);
                                } else {
                                    bot.sendMessage(msg.chat.id, `alerts FAILED to update`);
                                }
                            }).catch(error => {
                                console.error("Error updating notification:", error);
                                bot.sendMessage(msg.chat.id, `alerts FAILED to update due to an error`);
                            });
                        })
                    });
                }
            })
        }
    } else {
        bot.sendMessage(msg.chat.id, "Invalid ethereum address!\nFormat:  /addwallet <address>");
    }

});

bot.onText(/\/removewallet/, (msg: any) => {

    console.log(msg)
    const textParts = msg.text.split(" ");

    if(textParts[1] && textParts[1].length > 0){
        const walletAddress = textParts[1].toLowerCase();
        console.log(walletAddress)
    
        // check if this group already tracks the wallet
        checkIfGroupTracksWallet(msg.chat.id, walletAddress, (alreadyTracks) => {
        
            if(alreadyTracks){
                removeWalletFromTracking(walletAddress, msg.chat.id, () => {
                    console.log(`${walletAddress} removed from DB`);
                    bot.sendMessage(msg.chat.id, `${walletAddress} removed from DB`);

                    getAllWallets((wallets) => {

                        updateNotification(wallets).then(updateStatus => {
                            if (updateStatus) {
                                bot.sendMessage(msg.chat.id, `${walletAddress} is no longer being tracked`);
                            } else {
                                bot.sendMessage(msg.chat.id, `alerts FAILED to update`);
                            }
                        }).catch(error => {
                            console.error("Error updating notification:", error);
                            bot.sendMessage(msg.chat.id, `alerts FAILED to update due to an error`);
                        });
                    })
                });
            } else {
                bot.sendMessage(msg.chat.id, `wasn't tracking this wallet anyway...`);
            }
        })
    } else {
        bot.sendMessage(msg.chat.id, "Invalid ethereum address!\nFormat:  /removewallet <address>");
    }

});

bot.onText(/\/allwallets/, (msg: any) => {

    console.log(msg)
    const groupId = msg.chat.id;
    console.log(groupId)

    getAllWalletsOfAGroup(msg.chat.id, (wallets) => {
        if (wallets && wallets.length > 0) {

            const walletsString = wallets.map(wallet => 
                `${wallet.wallet_address}`
            ).join('\n');

            bot.sendMessage(groupId, walletsString);
        } else {
            bot.sendMessage(groupId, "No wallets found for this group.");
        }
    });
});

bot.onText(/\/printtableonserver/, (msg: any) => {

    getAllFromTable("wallets", (wallets: any) => {
        console.log(wallets);
        bot.sendMessage(msg.chat.id, "table printed");
    });
});


bot.on('polling_error', (error: any) => {
    console.log(error);  // Log the error
});





// some learning examples
/*
bot.onText(/\/config/, (msg) => {
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{text: 'Option 1', callback_data: 'option_1'}],
                [{text: 'Option 2', callback_data: 'option_2'}]
            ]
        }
    };
    bot.sendMessage(msg.chat.id, 'Choose an option:', opts);
});

bot.onText(/\/myoption/, (msg) => {

    console.log(msg)

    const userId = msg.from.id;
    console.log(userId)

    getUserChoice(userId, (userChoice) => {
        console.log(userChoice);

        const userChoiceMessage = `Your choice: ${userChoice}`
        bot.sendMessage(msg.chat.id, userChoiceMessage);
    });
});

bot.on('callback_query', (callbackQuery) => {
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    let chosenOption = '';
    if (data === 'option_1') {
        chosenOption = 'Option 1';
    } else if (data === 'option_2') {
        chosenOption = 'Option 2';
    }

    console.log(`user chose:   ${chosenOption}`)

    // Store the chosen option in the database
    updateUserChoice(userId, chosenOption)
});
*/


