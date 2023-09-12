const sqlite3 = require('sqlite3').verbose();





const db = new sqlite3.Database('userConfigs.db', (err) => {
    if (err) {
        console.error("Error opening database", err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

function initializeDatabase() {
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



function updateUserChoice(userId, chosenOption){
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

function addWalletToTrack(walletAddress, userId, groupId, callback) {
    db.run(`INSERT OR REPLACE INTO wallets (wallet_address, user_id, group_id) VALUES (?, ?, ?)`, [walletAddress, userId, groupId], (err) => {
        if (err) {
            console.error("Error adding wallet", err.message);
            callback(false);
        } else {
            callback(true);
        }
    });
}

function removeWalletFromTracking(walletAddress, groupId, callback) {
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

function getAllWallets(callback) {
    const query = `SELECT wallet_address FROM wallets`;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("Error retrieving wallets", err.message);
            callback(null);
        } else {
            callback(rows);
        }
    });
}

function getAllWalletsOfAGroup(groupId, callback) {
    const query = `SELECT wallet_address FROM wallets WHERE group_id = ?`;
    
    db.all(query, [groupId], (err, rows) => {
        if (err) {
            console.error("Error retrieving wallets", err.message);
            callback(null);
        } else {
            callback(rows);
        }
    });
}

function getAllGroupsTrackingAWallet(walletAddress, callback) {
    const query = `SELECT group_id FROM wallets WHERE wallet_address = ?`;

    db.all(query, [walletAddress], (err, rows) => {
        if (err) {
            console.error("Error checking combination", err.message);
            callback([]);
        } else {
            callback(rows);
        }
    });
}

function getAllFromTable(tableName, callback) {
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

function checkIfGroupTracksWallet(groupId, walletAddress, callback) {
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



