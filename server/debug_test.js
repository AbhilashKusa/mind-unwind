const { app, pool } = require('./server');
// initDb is in config/db.js
const { initDb } = require('./config/db');

async function test() {
    try {
        console.log("Dropping tasks table...");
        await pool.query('DROP TABLE IF EXISTS tasks CASCADE');
        console.log("Running Migration...");
        await initDb();
        console.log("Migration Complete.");
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

test();
