const db = require('../database.js');
const raceJobs = require('../raceJobs.js');

async function handlePlayerRegistration(message) {
    const filter = response => response.author.id === message.author.id;

    try {
        // Cek apakah user sudah terdaftar
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

module.exports = handlePlayerRegistration;
