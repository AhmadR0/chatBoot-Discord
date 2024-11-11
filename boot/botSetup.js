function setupBot(client) {
    client.once('ready', () => {
        console.log(`Logged in as ${client.user.tag}`);
    });
}

module.exports = { setupBot };