require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');


// Import modul
const { setupBot } = require('./boot/botSetup.js');
const { scheduleAgeUpdate } = require('./boot/fungction-boot/ageScheduler.js');
const handlePlayerRegistration = require('./boot/fungction-boot/playerRegistration.js');
const handleStatusCommand = require('./boot/fungction-boot/statusComnd.js');
// const {startBattle}  = require('./boot/fungction-boot/battleLogic.js');
const {startBattle}  = require('./boot/battle/battleMonster2.js');
// const {}
const comndBattle = require('./boot/comndBattle.js');

// Setup bot
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
setupBot(client);

// Jalankan jadwal pembaruan umur
scheduleAgeUpdate();

// Event listener untuk pesan
client.on('messageCreate', async (message) => {
    if (message.content.toLowerCase() === '/arise!') {
        handlePlayerRegistration(message);
    } else if (message.content.startsWith('!sts') || message.content.startsWith('!status')) {
        handleStatusCommand(message);
    }else if(message.content.startsWith('!go adv')){
        message.reply('selamat bertualang')
    }else if(message.content.startsWith('!Dungeon')){
        message.reply(`Dungeon blm tersedia!`);
    }else if(message.content.startsWith('!battle')){
        const playerId = message.author.id;
        const args = message.content.split(' '); // Membagi pesan untuk mendapatkan habitat
        const habitat = args[1] || 'normal'; // Jika tidak ada habitat diberikan, default ke 'normal'

        // Memulai pertempuran
        await startBattle(message, playerId, habitat);
    }else if(message.content.startsWith('healGods')){
        handle
    }
});


// comndBattle(client)

client.login(process.env.DISCORD_TOKEN);
