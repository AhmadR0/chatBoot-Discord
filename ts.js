require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const mysql = require('mysql2');
const schedule = require('node-schedule');

// Setup Discord Bot
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});


// Setup MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Definisi ras dan job yang terkait
const raceJobs = {
    'Elf': ['Witch', 'Healer', 'Archer', 'Assassin'],
    'Demon': ['Witch', 'Necromancer', 'Assassin', 'Warrior'],
    'Spirit': ['Witch', 'Healer', 'Spirit Guardian', 'Spirit Shaman'],
    'Dwarf': ['Tanker', 'Warrior', 'Smith', 'Berserker'],
    'Beast': ['Tanker', 'Warrior', 'Archer', 'Beastmaster'],
    'Angel': ['Healer', 'Witch', 'Archer', 'Warrior'],
    'Human': ['Witch', 'Assassin', 'Necromancer', 'Healer', 'Archer', 'Tanker', 'Warrior']
};

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Jadwal untuk memperbarui umur setiap 2 bulan
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

client.on('messageCreate', async (message) => {
    if (message.content.toLowerCase() === '/arise!' && !message.author.bot) {
        try {
            // Cek apakah user sudah terdaftar sebagai player
            const [playerExists] = await db.promise().query("SELECT * FROM players WHERE discord_id = ?", [message.author.id]);
            if (playerExists.length > 0) {
                return message.reply("⚠️ Kamu sudah terdaftar sebagai petualang di Aetherra! Tidak perlu mendaftar lagi.");
            }

            await message.reply("```╔════════════════════════════════════════════════════════════════════════════════════╗\n" +
                                "🌌 Wahai Jiwa yang Murni, yang baru saja tiba di ambang dunia yang penuh misteri... 🌌\n" +
                                "╚════════════════════════════════════════════════════════════════════════════════════╝```");

            await message.reply("```🌠 Dalam kehampaan dan kegelapan, suara ini memanggilmu. Siapakah dirimu yang hendak memasuki dunia kami? 🌠\n" +
                                "✨ Sampaikan nama dan rasmu kepada bintang-bintang di langit! ✨\n\nRas yang tersedia: Human, Elf, Dwarf, Beast, Demon.\nKetikkan nama ras pilihanmu!\n\n```");

            const filter = response => response.author.id === message.author.id;
            const collectedRace = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
            const raceName = collectedRace.first().content;

            if (!raceJobs[raceName]) {
                return message.reply("🚫 Ras yang dipilih tidak dikenal oleh bintang-bintang. Harap pilih dari ras yang tersedia.");
            }

            await message.reply(`\`\`\`⚔️ Engkau memilih ras ${raceName}. Sungguh, pilihan yang menggetarkan dunia ini! ⚔️\n` +
                                "Dunia Aetherra telah menantikan kehadiranmu sekian lama. Namun, sebelum langkahmu dimulai,\n" +
                                `sampaikan pula jalan hidup yang hendak kau tempuh.\n\n📜 Job yang tersedia untuk ras ${raceName}: ${raceJobs[raceName].join(", ")}\nKetikkan job pilihanmu.\`\`\``);

            const collectedJob = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
            const jobName = collectedJob.first().content;

            if (!raceJobs[raceName].includes(jobName)) {
                return message.reply(`🚫 Job ${jobName} tidak ditakdirkan bagi kaum ${raceName}. Pilih job yang tersedia.`);
            }

            // Dapatkan job_id dari database berdasarkan nama job
            const [jobData] = await db.promise().query("SELECT job_id FROM jobs WHERE job_name = ?", [jobName]);
            const jobId = jobData[0]?.job_id;

            if (!jobId) {
                return message.reply("Job tidak ditemukan dalam database. Silakan coba lagi.");
            }

            // Pilih satu weapon dan armor secara acak
            const [weaponData] = await db.promise().query("SELECT equipment_id, equipment_name, COALESCE(SUM(attack_bonus), 0) AS attack FROM equipment WHERE required_job_id = ? AND equipment_type = 'Weapon' GROUP BY equipment_id ORDER BY RAND() LIMIT 1", [jobId]);
            const [armorData] = await db.promise().query("SELECT equipment_id, equipment_name, COALESCE(SUM(defense_bonus), 0) AS defense FROM equipment WHERE required_job_id = ? AND equipment_type = 'Armor' GROUP BY equipment_id ORDER BY RAND() LIMIT 1", [jobId]);

            if (weaponData.length === 0 || armorData.length === 0) {
                return message.reply("Tidak ada weapon atau armor yang tersedia untuk job ini. Silakan cek pengaturan equipment di database.");
            }

            // Dapatkan detail weapon dan armor
            const equipmentWeapon = weaponData[0].equipment_name;
            const equipmentAttackBonus = weaponData[0].attack;
            const equipmentArmor = armorData[0].equipment_name;
            const equipmentDefenseBonus = armorData[0].defense;

            // Total ATK & DEF dengan skill bonus
            const [skills] = await db.promise().query("SELECT COALESCE(SUM(attack), 0) AS skillAttack, COALESCE(SUM(defense), 0) AS skillDefense FROM skills WHERE job_id = ?", [jobId]);
            const totalAttack = Number(skills[0].skillAttack || 0) + Number(equipmentAttackBonus);
            const totalDefense = Number(skills[0].skillDefense || 0) + Number(equipmentDefenseBonus);

            await message.reply(`\`\`\`⚔️ Kau diberkahi dengan perlengkapan berikut:\n🗡️ Weapon: ${equipmentWeapon} (+${equipmentAttackBonus} ATK)\n🛡️ Armor: ${equipmentArmor} (+${equipmentDefenseBonus} DEF)\n\nKekuatanmu kini mencapai ${totalAttack} ATK dan pertahananmu ${totalDefense} DEF!\`\`\``);

            await message.reply("```🕰️ Sekarang, sampaikan usiamu, wahai jiwa yang baru lahir. Ketikkan usia dalam bilangan.```");
            const collectedAge = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
            const age = parseInt(collectedAge.first().content);

            await message.reply("```👤 Sebutkan pula gendermu (L untuk Laki-Laki, P untuk Perempuan):```");
            const collectedGender = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
            const genderInput = collectedGender.first().content.toLowerCase();
            const gender = genderInput === 'l' ? 'Laki-Laki' : 'Perempuan';

            // Mendapatkan race_id dari database
            const [raceData] = await db.promise().query("SELECT race_id FROM races WHERE race_name = ?", [raceName]);
            const raceId = raceData[0]?.race_id;

            if (!raceId || !jobId) {
                return message.reply("Ras atau job tidak ditemukan dalam database. Silakan coba lagi.");
            }

            // Menyimpan karakter dalam database
            const insertQuery = `
                INSERT INTO players (discord_id, username, race_id, job_id, equipment_weapon_id, equipment_armor_id, attack, defense, age, gender, level, xp, \`rank\`) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const values = [message.author.id, message.author.username, raceId, jobId, weaponData[0].equipment_id, armorData[0].equipment_id, totalAttack, totalDefense, age, gender, 1, 0, "Ordinary People"];

            db.query(insertQuery, values, (err) => {
                if (err) {
                    console.error("Error saat mendaftar karakter:", err);
                    return message.reply("Terjadi kesalahan saat mendaftar karakter. Silakan coba lagi.");
                }
                message.reply("```🔥 Dengan segala kekuatan dan berkat, kau kini terlahir sebagai sosok yang baru! 🔥\n" +
                              "⚔️ Dunia Aetherra menanti petualanganmu, wahai jiwa pemberani! 🌌\n\nLangkah pertamamu telah tertulis dalam bintang-bintang...\n" +
                              "Beranilah menempuh jalan menuju takdirmu!```");
            });

        } catch (error) {
            console.error("Error:", error);
            message.reply("Terjadi kesalahan. Silakan coba lagi.");
        }
    }
});




client.on('messageCreate', async (message) => {
    // Periksa apakah pesan dimulai dengan perintah !sts atau !status
    if (message.content.startsWith('!sts') || message.content.startsWith('!status')) {
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
                { name: "💎 Reputasi", value: player.coin.toString(), inline: true },
                { name: "📜 Deskripsi", value: player.description || "Belum ada deskripsi", inline: false }
            )
            .setFooter({ text: "⏳ Kartu ini akan hilang dalam 15 detik untuk menjaga privasi." })
            .setTimestamp();

        // Kirim embed sebagai balasan
        const profileMessage = await message.reply({ embeds: [profileEmbed] });

        // Hapus pesan profil setelah 15 detik untuk menjaga privasi
        
    }
});


client.login(process.env.DISCORD_TOKEN);
