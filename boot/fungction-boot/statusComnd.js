const db = require('../database.js');
const { EmbedBuilder } = require('discord.js');

async function handleStatusCommand(message) {
    const args = message.content.split(" ");
    let userId;
    
    // Jika pemain lain disebut, ambil ID pemain tersebut; jika tidak, gunakan ID pengirim pesan
    if (args[1] && message.mentions.users.size > 0) {
        userId = message.mentions.users.first().id;
    } else {
        userId = message.author.id;
    }

    // Dapatkan informasi pemain dari database berdasarkan discord_id
    const [playerData] = await db.promise().query(`
        SELECT 
            p.username, p.level, p.xp, p.gender, p.age, p.height, p.weight, p.attack, 
            p.defense, p.rank, p.title, p.coin, p.description,
            r.race_name AS race, 
            j.job_name AS job, 
            ew.equipment_name AS weapon, 
            ea.equipment_name AS armor
        FROM players p
        LEFT JOIN races r ON p.race_id = r.race_id
        LEFT JOIN jobs j ON p.job_id = j.job_id
        LEFT JOIN equipment ew ON p.equipment_weapon_id = ew.equipment_id
        LEFT JOIN equipment ea ON p.equipment_armor_id = ea.equipment_id
        WHERE p.discord_id = ?
    `, [userId]);
    
    if (!playerData.length) {
        return message.reply("⚠️ Karna sebuah hal jiwa ini belum hadir di Aethera!!");
    }

    const player = playerData[0];
    
    // Buat embed status karakter
    const profileEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`🧙 Status Karakter: ${player.username || "Tidak diketahui"} 🧙`)
        .setThumbnail(message.mentions.users.size > 0 ? message.mentions.users.first().displayAvatarURL() : message.author.displayAvatarURL())
        .addFields(
            { name: "🔷 Ras", value: player.race || "Tidak diketahui", inline: true },
            { name: "💼 Job", value: player.job || "Tidak diketahui", inline: true },
            { name: "🎖️ Level", value: (player.level || 1).toString(), inline: true },
            { name: "🏆 XP", value: (player.xp || 0).toString(), inline: true },
            { name: "🔹 Gender", value: player.gender || "Tidak diketahui", inline: true },
            { name: "🧬 Usia", value: `${player.age || 0} tahun`, inline: true },
            { name: "📈 Rank", value: player.rank || "Tidak diketahui", inline: true },
            { name: "⚔️ Attack", value: (player.attack || 0).toString(), inline: true },
            { name: "🛡️ Defense", value: (player.defense || 0).toString(), inline: true },
            { name: "🗡️ Weapon", value: player.weapon || "Tidak ada", inline: true },
            { name: "🛡️ Armor", value: player.armor || "Tidak ada", inline: true },
            { name: "👛 Coin", value: player.coin.toString(), inline: true },
            { name: "📜 Deskripsi", value: player.description || "Belum ada deskripsi", inline: false }
        )
        .setFooter({ text: "⏳ Kartu ini akan hilang dalam 15 detik untuk menjaga privasi." })
        .setTimestamp();

    // Kirim embed sebagai balasan
    const profileMessage = await message.reply({ embeds: [profileEmbed] });

    // Hapus pesan profil setelah 15 detik untuk menjaga privasi
    // setTimeout(() => profileMessage.delete().catch(console.error), 15000);
}

module.exports = handleStatusCommand;
