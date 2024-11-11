// battleLogic.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const goblinSkills = {
    attack: {
        name: "Serangan Belati ⚔️",
        damage: Math.floor(Math.random() * (10 - 5 + 1)) + 5,
        description: "Goblin menyerang Anda dengan belatinya! 🗡️",
    },
    claw: {
        name: "Cakar Tajam 🐾",
        damage: Math.floor(Math.random() * (15 - 10 + 1)) + 10,
        description: "Goblin melancarkan serangan cakar tajam!",
    },
    hide: {
        name: "Bersembunyi 🌑",
        chanceToDodge: 50,
        description: "Goblin bersembunyi di bayangan, meningkatkan kemungkinan menghindar. 🕶️",
    }
};

async function startBattle(message) {
    const battleIntro = `🌌 **Petualangan Anda Dimulai!** 🌌\n\n🛡️ **Goblin Kecil Menghadangmu!**\nBersiaplah untuk bertarung dan tunjukkan kekuatanmu di dunia lain ini!\n\n\`\`\`Siapkan strategi dan atur seranganmu! Pilih tindakanmu:\n- **Attack** untuk menyerang musuh\n- **Skill** untuk serangan spesial\n- **Defense** untuk bertahan\n- **Dodge** untuk menghindari serangan\n\nAyo mulai pertempuranmu!\`\`\``;
    
    const actionButtons = [
        { label: '⚔️ Attack', customId: 'att', style: ButtonStyle.Primary },
        { label: '✨ Skill', customId: 'skill', style: ButtonStyle.Secondary },
        { label: '🛡️ Defense', customId: 'def', style: ButtonStyle.Success },
        { label: '💨 Dodge', customId: 'dodge', style: ButtonStyle.Danger }
    ];

    const row = new ActionRowBuilder().addComponents(actionButtons.map(btn => new ButtonBuilder()
        .setLabel(btn.label)
        .setCustomId(btn.customId)
        .setStyle(btn.style)
    ));

    const battleMessage = await message.channel.send({ content: battleIntro, components: [row] });

    let playerHP = 100;
    let goblinHP = 100;
    let battleHistory = [];

    const filter = i => i.customId === 'att' || i.customId === 'skill' || i.customId === 'def' || i.customId === 'dodge';
    const collector = message.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        let playerAction = i.customId;
        let damageToGoblin = 0;
        let damageToPlayer = 0;
        let playerDescription = '';

        if (playerAction === 'att') {
            damageToGoblin = 10;
            goblinHP -= damageToGoblin;
            playerDescription = `🗡️ **Serangan Sukses!**\nAnda menyerang Goblin, memberi dampak +${damageToGoblin} pada HP-nya.`;
        } 
        else if (playerAction === 'skill') {
            damageToGoblin = 20;
            goblinHP -= damageToGoblin;
            playerDescription = `🔥 **Skill Dilepaskan!**\nAnda menggunakan skill dan memberikan dampak +${damageToGoblin} pada Goblin.`;
        } 
        else if (playerAction === 'def') {
            const monsterDamage = goblinSkills.attack.damage;
            damageToPlayer = Math.max(0, monsterDamage - 5);
            playerHP -= damageToPlayer;
            playerDescription = `🛡️ **Pertahanan Kuat!**\nAnda bertahan dan menerima serangan dengan dampak +${damageToPlayer} AT.`;
        } 
        else if (playerAction === 'dodge') {
            const dodgeChance = Math.max(0, 50 - (100 - playerHP));
            if (Math.random() * 100 < dodgeChance) {
                playerDescription = `💨 **Menghindar Berhasil!**\nAnda berhasil menghindar dari serangan Goblin.`;
            } else {
                damageToPlayer = goblinSkills.attack.damage;
                playerHP -= damageToPlayer;
                playerDescription = `🚨 **Gagal Menghindar!**\nGoblin menyerang, memberi dampak +${damageToPlayer} pada HP Anda.`;
            }
        }

        if (goblinHP > 0) {
            const goblinAction = Math.random() < 0.5 ? 'attack' : 'claw';
            damageToPlayer = goblinSkills[goblinAction].damage;
            playerHP -= damageToPlayer;
            playerDescription += `\n🩸 **Serangan Balasan Goblin!**\nGoblin menggunakan ${goblinSkills[goblinAction].name}, memberi dampak +${damageToPlayer} pada HP Anda.`;
        }

        let status = `\`\`\`💥 Status Pertarungan 💥\n[${message.author.username}]: HP ${playerHP}/100 ❤️\n[🧟 Goblin Kecil]: HP ${goblinHP}/100\n\`\`\``;
        battleHistory.push(playerDescription);

        await i.update({ content: `${playerDescription}\n\n${status}`, components: [row] });

        if (playerHP <= 0) {
            collector.stop();
            await message.channel.send(`\`\`\`⚔️ **Pertempuran Berakhir** ⚔️\n\nKamu dikalahkan oleh Goblin Kecil... Latihlah dirimu dan kembali lagi untuk membalas dendam!\n\n🔚 **Rangkuman Pertarungan:**\n${battleHistory.join('\n')}\`\`\``);
        } else if (goblinHP <= 0) {
            collector.stop();
            await message.channel.send(`\`\`\`🎉 **Selamat! Kamu Menang!** 🎉\n\nAnda berhasil mengalahkan Goblin Kecil!\n\n🔚 **Rangkuman Pertarungan:**\n${battleHistory.join('\n')}\n\n✨ Teruslah berjuang di tanah Aehterra ini, Pahlawan!✨\`\`\``);
        }
    });
}

module.exports = { startBattle };
