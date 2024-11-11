const { EmbedBuilder } = require('discord.js');
const logicChar = require('./fungction-boot/logicChar');

// Fungsi untuk menangani pembuatan karakter
async function handleCharacterCreation(message, db) {
    try {
        const response = await logicChar.createCharacterPrompt(message, db);
        await message.reply(response);
    } catch (error) {
        console.error("Error:", error);
        message.reply("Terjadi kesalahan. Silakan coba lagi.");
    }
}

// Fungsi untuk menangani perintah status
async function handleStatusCommand(message, db) {
    const args = message.content.split(" ");
    const userId = args[1] && message.mentions.users.size > 0 ? message.mentions.users.first().id : message.author.id;
    
    try {
        const profileEmbed = await logicChar.getCharacterStatusEmbed(userId, db, message);
        message.reply({ embeds: [profileEmbed] });
    } catch (error) {
        console.error("Error retrieving character status:", error);
        message.reply("⚠️ Karna sebuah hal jiwa ini belum hadir di Aethera!!");
    }
}

module.exports = { handleCharacterCreation, handleStatusCommand };
