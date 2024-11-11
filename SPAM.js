// battleLogic.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');  // File koneksi database

// Fungsi untuk mendapatkan monster berdasarkan habitat, tipe, dan level pemain
async function getMonstersByHabitat(habitat, monsterType = 'normal', playerLevel) {
    const [monsters] = await db.promise().query(`
        SELECT * FROM monsters 
        WHERE habitat = ? 
        AND monster_type = ? 
        AND required_level <= ?
    `, [habitat, monsterType, playerLevel]);

    if (monsters.length === 0) {
        throw new Error(`Tidak ada monster di habitat "${habitat}" yang cocok dengan level player.`);
    }

    // Pilih monster acak dari daftar yang memenuhi kriteria
    return monsters[Math.floor(Math.random() * monsters.length)];
}

// Fungsi untuk mendapatkan skill player berdasarkan job_id
async function getPlayerSkills(jobId) {
    const [skills] = await db.promise().query(`
        SELECT * FROM skills WHERE job_id = ?
    `, [jobId]);
    return skills;
}

// Fungsi untuk mendapatkan data equipment player berdasarkan player_id
async function getPlayerEquipment(playerId) {
    const [playerEquipment] = await db.promise().query(`
        SELECT equipment_weapon_id, equipment_armor_id FROM players 
        WHERE discord_id = ?`, [playerId]);

    if (playerEquipment.length === 0) {
        throw new Error(`Tidak ada data equipment untuk player_id: ${playerId}`);
    }

    const { equipment_weapon_id, equipment_armor_id } = playerEquipment[0];

    // Ambil data weapon dan armor berdasarkan ID-nya dari tabel Equipment
    const [equipment] = await db.promise().query(`
        SELECT equipment_name, equipment_type, attack_bonus, defense_bonus 
        FROM equipment 
        WHERE equipment_id IN (?, ?)
    `, [equipment_weapon_id, equipment_armor_id]);

    const equipmentData = {
        weapon: equipment.find(item => item.equipment_type === 'Weapon') || null,
        armor: equipment.find(item => item.equipment_type === 'Armor') || null
    };

    return equipmentData;
}

// Fungsi utama untuk memulai pertempuran
async function startBattle(message, playerId, habitat) {
    try {
        // Ambil data player dan equipment
        const [playerResult] = await db.promise().query(`SELECT * FROM players WHERE discord_id = ?`, [playerId]);
        const player = playerResult[0];
        if (!player) return message.reply("ERORID 402 ⛔: Player tidak ditemukan.");

        const playerEquipment = await getPlayerEquipment(playerId);
        const playerSkills = await getPlayerSkills(player.job_id);

        if (playerSkills.length < 4) {
            return message.reply("Player tidak memiliki cukup skill untuk bertempur. Pastikan ada 4 skill.");
        }

        // Ambil data monster berdasarkan habitat
        const monster = await getMonstersByHabitat(habitat, 'normal', player.level);
    
        // Membuat tombol aksi berdasarkan skill dan weapon
        const actionButtons = playerSkills.slice(0, 4).map((skill, index) => ({
            label: `Skill ${index + 1}: ${skill.skill_name}`,
            customId: `skill_${skill.skill_id}`,
            style: ButtonStyle.Primary
        }));

        // Menambahkan tombol weapon jika ada
        if (playerEquipment.weapon) {
            actionButtons.push({
                label: `Weapon: ${playerEquipment.weapon.equipment_name}`,
                customId: 'weapon',
                style: ButtonStyle.Secondary
            });
        }

        const row = new ActionRowBuilder().addComponents(
            actionButtons.map(btn => new ButtonBuilder().setLabel(btn.label).setCustomId(btn.customId).setStyle(btn.style))
        );

        const battleMessage = await message.channel.send({
            content: `🌌 **Pertempuran Dimulai!**\n\n🛡️ **Monster: ${monster.monster_name} (Level ${monster.level})**\nHP: ${monster.health}`,
            components: [row]
        });

        const filter = i => actionButtons.some(btn => btn.customId === i.customId);
        const collector = message.channel.createMessageComponentCollector({ filter, time: 60000 });

        // Setting XP tambahan berdasarkan level monster
        const xpGain = Math.floor((monster.level / player.level) * 10) + Math.floor(Math.random() * 5) + 5;

        collector.on('collect', async i => {
            let playerAction = i.customId;
            let damageToMonster = 0;
            let playerDescription = '';

            if (playerAction.startsWith('skill')) {
                const skillId = parseInt(playerAction.split('_')[1]);
                const skill = playerSkills.find(s => s.skill_id === skillId);
                damageToMonster = skill.attack;
                playerDescription = `✨ Menggunakan Skill ${skill.skill_name} dengan dampak ${damageToMonster}.`;
            } else if (playerAction === 'weapon' && playerEquipment.weapon) {
                const weaponEffect = playerEquipment.weapon.attack_bonus;
                damageToMonster = weaponEffect;
                playerDescription = `🗡️ Menggunakan weapon ${playerEquipment.weapon.equipment_name} dengan dampak ${damageToMonster}.`;
            }

            // Update HP monster dan status pertarungan
            monster.health -= damageToMonster;
            let status = `\`\`\`Status Pertarungan:\n[${message.author.username}]: HP ${player.hp}\n[${monster.monster_name}]: HP ${monster.health}\n\`\`\``;

            await i.update({ content: `${playerDescription}\n\n${status}`, components: [row] });

            // Cek jika monster kalah
            if (monster.health <= 0) {
                collector.stop();
                
                // Tambahkan XP jika monster dikalahkan
                await db.promise().query(`
                    UPDATE players SET xp = xp + ?, hp = ? WHERE player_id = ?`, [xpGain, player.hp, playerId]);

                await message.channel.send(`\`\`\`🏆 Kemenangan!\n\nAnda mengalahkan ${monster.monster_name} dan mendapatkan ${xpGain} XP.\n\`\`\``);
            }
        });
    } catch (error) {
        console.error('Terjadi error saat memulai pertempuran:', error);
        message.reply('Terjadi error internal saat memulai pertempuran. Silakan coba lagi.');
    }
}

module.exports = { startBattle };





