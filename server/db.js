// import using require with Node.js
const mysql = require('mysql2');
// dotenv is what reads my .env file and makes them available using process.env
require('dotenv').config();

// pool creates multiple db connections so that if multiple requests come in at the same time (unlikely for this use case but still something to know, hence me using it) they won't be waiting one at a time
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

pool.on('connection', (connection) => {
    connection.query("SET time_zone = '-04:00'");
    // connection.query("SELECT @@session.time_zone", (err, rows) => {
    //     console.log('session timezone:', rows);
    // });
});

// promise means it uses async/await
module.exports = pool.promise();