import { Database, verbose } from 'sqlite3';
import { Address, WalletsRow_only_GI, WalletsRow_only_GI_Callback, WalletsRow_only_WA, Wallets_only_WA_Callback } from './customTypes';

const db = new (verbose().Database)('userConfigs.db', (err: Error | null) => {
    if (err) {
        console.error("Error opening database", err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

export function initializeDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS user_configs (
        user_id INTEGER PRIMARY KEY,
        chosen_option TEXT
    )`, (err) => {
        if (err) {
            console.error("Error creating user_configs table", err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet_address CHAR(42),
        user_id INTEGER,
        group_id INTEGER
    )`, (err) => {
        if (err) {
            console.error("Error creating wallets table", err.message);
        }
    });
}



export function addWalletToTrack(walletAddress: Address, userId: number, groupId: number, callback: (success: boolean) => void) {
    db.run(`INSERT OR REPLACE INTO wallets (wallet_address, user_id, group_id) VALUES (?, ?, ?)`, [walletAddress, userId, groupId], (err) => {
        if (err) {
            console.error("Error adding wallet", err.message);
            callback(false);
        } else {
            callback(true);
        }
    });
}

export function removeWalletFromTracking(walletAddress: Address, groupId: number, callback: (success: boolean) => void) {
    const query = `DELETE FROM wallets WHERE group_id = ? AND wallet_address = ?`;

    db.run(query, [groupId, walletAddress], (err) => {
        if (err) {
            console.error("Error removing wallet", err.message);
            callback(false);
        } else {
            callback(true);
        }
    });
}

export function getAllWallets(callback: Wallets_only_WA_Callback) {
    const query = `SELECT wallet_address FROM wallets`;
    
    db.all(query, [], (err, rows: any) => {
        if (err) {
            console.error("Error retrieving wallets", err.message);
            callback(null);
        } else {
            callback(rows as WalletsRow_only_WA[]);
        }
    });
}

export function getAllWalletsOfAGroup(groupId: number, callback: Wallets_only_WA_Callback) {
    const query = `SELECT wallet_address FROM wallets WHERE group_id = ?`;
    
    db.all(query, [groupId], (err, rows: any) => {
        if (err) {
            console.error("Error retrieving wallets", err.message);
            callback(null);
        } else {
            callback(rows as WalletsRow_only_WA[]);
        }
    });
}

export function getAllGroupsTrackingAWallet(walletAddress: Address, callback: WalletsRow_only_GI_Callback) {
    const query = `SELECT group_id FROM wallets WHERE wallet_address = ?`;

    db.all(query, [walletAddress], (err, rows: any) => {
        if (err) {
            console.error("Error checking combination", err.message);
            callback([]);
        } else {
            callback(rows as WalletsRow_only_GI[]);
        }
    });
}

export function getAllFromTable(tableName: string, callback: any) {
    // Ensure table name is safe to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
        console.error("Invalid table name");
        callback(null);
        return;
    }

    const query = `SELECT * FROM ${tableName}`;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error(`Error retrieving data from table ${tableName}`, err.message);
            callback(null);
        } else {
            callback(rows);
        }
    });


}

export function checkIfGroupTracksWallet(groupId: number, walletAddress: Address, callback: (success: boolean) => void) {
    const query = `SELECT 1 FROM wallets WHERE group_id = ? AND wallet_address = ? LIMIT 1`;

    db.get(query, [groupId, walletAddress], (err, row) => {
        if (err) {
            console.error("Error checking combination", err.message);
            callback(false);
        } else {
            callback(row ? true : false);
        }
    });
}


/*
module.exports = {
    db: db,
    initializeDatabase: initializeDatabase,
    updateUserChoice: updateUserChoice,
    getUserChoice: getUserChoice,
    addWalletToTrack: addWalletToTrack,
    removeWalletFromTracking: removeWalletFromTracking,
    getAllWallets: getAllWallets,
    getAllWalletsOfAGroup: getAllWalletsOfAGroup,
    getAllGroupsTrackingAWallet: getAllGroupsTrackingAWallet,
    getAllFromTable: getAllFromTable,
    checkIfGroupTracksWallet: checkIfGroupTracksWallet
};
*/





// some old examples of usage
/*
function updateUserChoice(userId: number, chosenOption){
    db.run(`INSERT OR REPLACE INTO user_configs (user_id, chosen_option) VALUES (?, ?)`, [userId, chosenOption], (err) => {
        if (err) {
            console.error("Error storing user choice", err.message);
        }
    });
}

function getUserChoice(userId, callback) {
    db.get(`SELECT chosen_option FROM user_configs WHERE user_id = ?`, [userId], (err, row) => {
        if (err) {
            console.error("Error retrieving user choice", err.message);
            callback(null);
        } else {
            callback(row ? row.chosen_option : null);
        }
    });
}
*/