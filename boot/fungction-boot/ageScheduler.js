const schedule = require('node-schedule');
const db = require('../database.js');

function scheduleAgeUpdate() {
    schedule.scheduleJob('0 0 1 */2 *', () => {
        const updateAgeQuery = `UPDATE players SET usia = usia + 1`;
        db.query(updateAgeQuery, (err) => {
            if (err) {
                console.error("Error memperbarui umur:", err);
            } else {
                console.log("Umur pemain telah diperbarui.");
            }
        });
    });
}

module.exports = { scheduleAgeUpdate };
