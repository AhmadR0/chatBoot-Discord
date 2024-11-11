// const { startBattle } = require('./fungction-boot/battleLogic.js');
const {startBattle}= require('./battle/battleMonster2')


module.exports = (client) => {
    client.on('messageCreate', async message => {
        if (message.content === '!battle') {
            await startBattle(message,message.author.id,1);
        }
    });
};