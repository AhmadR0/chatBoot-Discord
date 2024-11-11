require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const mysql = require('mysql2');

const { checkStatus, checkDescription } = require('./boot/comndChar.js');
const comndBattle  = require('./boot/comndBattle.js')
// const { checkStatus, checkDescription } = require('./bot/comndChar');

// Setup Discord Bot
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Setup MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connect to MySQL Database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL database.');
});

// Register Slash Commands
const commands = [
    {
        name: 'start',
        description: 'Mulai pendaftaran karakter',
        options: [
            {
                name: 'gender',
                type: 3, // STRING
                description: 'Pilih gender (L/P)',
                required: true
            },
            {
                name: 'ras',
                type: 3, // STRING
                description: 'Pilih ras (Manusia, Beast, Elf, Demon, Dwarf)',
                required: true
            },
            {
                name: 'tinggi',
                type: 4, // INTEGER
                description: 'Masukkan tinggi badan (dalam cm)',
                required: true
            },
            {
                name: 'berat',
                type: 4, // INTEGER
                description: 'Masukkan berat badan (dalam kg)',
                required: true
            },
            {
                name: 'usia',
                type: 4, // INTEGER
                description: 'Masukkan usia (dalam tahun)',
                required: true
            }
        ]
    },
    {
        name: 'desc_player',
        description: 'Tambahkan deskripsi karakter Anda',
        options: [
            {
                name: 'deskripsi',
                type: 3, // STRING
                description: 'Masukkan deskripsi karakter (maks 1000 karakter)',
                required: true
            }
        ]
    },
];

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
            body: commands,
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// Event when the bot is ready
client.once('ready', () => {
    console.log('Bot is online!');
});


client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'start') {
        const username = interaction.user.username;

        
        db.query('SELECT * FROM players WHERE username = ?', [username], async (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                return interaction.reply('Terjadi kesalahan saat memeriksa username.');
            }

            if (results.length > 0) {
                return interaction.reply('Anda sudah memiliki karakter!');
            }

            const gender = options.getString('gender').toUpperCase() === 'L' ? 'Laki-laki' : 'Perempuan';
            const ras = options.getString('ras');
            const tinggi_badan = options.getInteger('tinggi');
            const berat_badan = options.getInteger('berat');
            const usia = options.getInteger('usia');


            db.query('INSERT INTO players (username, gender, ras, tinggi_badan, berat_badan, usia) VALUES (?, ?, ?, ?, ?, ?)', 
            [username, gender, ras, tinggi_badan, berat_badan, usia], (err) => {
                if (err) {
                    console.error('Error inserting player:', err);
                    return interaction.reply('Pendaftaran karakter gagal. Silakan coba lagi.');
                }
                interaction.reply(`Karakter Anda telah dibuat, ${username}!`);
            });
        });
    }
});



client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'desc_player') {
        const username = interaction.user.username;
        const description = interaction.options.getString('deskripsi');

        if (description.length > 1000) {
            return interaction.reply('Deskripsi terlalu panjang! Maksimal 1000 karakter.');
        }

        db.query(
            'UPDATE players SET deskripsi = ? WHERE username = ?',
            [description, username],
            (err) => {
                if (err) {
                    console.error('Error updating description:', err);
                    return interaction.reply('Terjadi kesalahan saat menambahkan deskripsi.');
                }
                interaction.reply('Deskripsi karakter berhasil ditambahkan!');
            }
        );
    }
});

// client.on('messageCreate', async (message) => {
//     if (message.author.bot) return;

    
//     if (message.content.startsWith('!profile')) {
//         const username = message.author.username;

        
//         db.query('SELECT * FROM players WHERE username = ?', [username], (err, results) => {
//             if (err) {
//                 console.error('Error querying database:', err);
//                 return message.channel.send('Terjadi kesalahan saat mengambil data profil.');
//             }

//             if (results.length === 0) {
//                 return message.channel.send('Anda belum memiliki karakter!');
//             }

//             const player = results[0];
//             message.channel.send(`**Profil Karakter**\nUsername: ${player.username}\nGender: ${player.gender}\nRas: ${player.ras}\nTinggi Badan: ${player.tinggi_badan} cm\nBerat Badan: ${player.berat_badan} kg\nUsia: ${player.usia} tahun`);
//         });
//     }
// });



// Event saat pesan dibuat
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const command = message.content.trim().split(' ')[0].toLowerCase();
    if (command === '!sts' || command === '!status') {
        await checkStatus(message);
    } else if (command === '!desc' || command === '!descrip') {
        await checkDescription(message);
    }
});






//========================batel
// client.on('messageCreate', async (message) => {
//     if (message.author.bot) return; // Mengabaikan pesan dari bot
//     if (message.content.startsWith('#battle')) {
//         await commandBattle.execute(message); // Panggil fungsi execute dari comndBattle.js
//     }
// });


// client.on('interactionCreate', async interaction => {
//     if (!interaction.isButton()) return; // Pastikan ini adalah interaksi tombol

//     const action = interaction.customId;
//     let responseMessage = `${interaction.user.username} melakukan `;

//     switch (action) {
//         case 'att':
//             responseMessage += 'Attack!';
//             break;
//         case 'def':
//             responseMessage += 'Defense!';
//             break;
//         case 'heal':
//             responseMessage += 'Heal!';
//             break;
//         case 'dodge':
//             responseMessage += 'Dodge!';
//             break;
//         case 'skill':
//             responseMessage += 'Skill!';
//             break;
//         default:
//             responseMessage += 'aksi tidak dikenali!';
//             break;
//     }

//     await interaction.deferUpdate();

//     await interaction.channel.send(responseMessage);
// });

comndBattle(client);
// Import modul dari discord.js




client.login(process.env.DISCORD_TOKEN);