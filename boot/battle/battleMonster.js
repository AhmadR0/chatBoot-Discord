// Import database
const { sequelize } = require('../database.js');

// Fungsi untuk mendapatkan monster secara acak sesuai wilayah dan level pemain
async function getRandomMonster(location, playerLevel) {
    try {
        // Query untuk mengambil monster berdasarkan wilayah dan level pemain
        const [monsters] = await sequelize.query(`
            SELECT * FROM monsters
            WHERE location = '${location}' AND min_level <= ${playerLevel} AND max_level >= ${playerLevel}
        `);

        // Memilih satu monster secara acak dari hasil query
        if (monsters.length > 0) {
            const randomIndex = Math.floor(Math.random() * monsters.length);
            return monsters[randomIndex];
        } else {
            return null;  // Tidak ada monster yang ditemukan
        }
    } catch (error) {
        console.error('Error retrieving monster:', error);
        return null;
    }
}

// Fungsi utama untuk menjalankan battle
async function startBattle(player, location) {
    const playerLevel = player.level;

    // Mengambil monster berdasarkan lokasi dan level pemain
    const monster = await getRandomMonster(location, playerLevel);

    if (!monster) {
        console.log('Tidak ada monster yang sesuai ditemukan di lokasi ini.');
        return;
    }

    // Menampilkan informasi monster yang akan dilawan
    console.log(`Kamu bertemu dengan monster ${monster.name} (HP: ${monster.hp}, ATK: ${monster.attack}, DEF: ${monster.defense}) di ${location}!`);
    
    // Status awal pemain dan monster
    let playerHP = player.hp;
    let monsterHP = monster.hp;

    // Loop pertempuran sampai salah satu HP habis
    while (playerHP > 0 && monsterHP > 0) {
        // Hitungan serangan pemain ke monster
        const playerDamage = Math.max(0, player.attack - monster.defense);
        monsterHP -= playerDamage;
        console.log(`Kamu menyerang ${monster.name} dan mengurangi ${playerDamage} HP. Sisa HP monster: ${monsterHP}`);

        if (monsterHP <= 0) {
            console.log(`Kamu telah mengalahkan ${monster.name}!`);
            // Tambahkan fungsi reward jika perlu
            return;
        }

        // Hitungan serangan monster ke pemain
        const monsterDamage = Math.max(0, monster.attack - player.defense);
        playerHP -= monsterDamage;
        console.log(`${monster.name} menyerangmu dan mengurangi ${monsterDamage} HP. Sisa HP kamu: ${playerHP}`);

        if (playerHP <= 0) {
            console.log('Kamu telah dikalahkan oleh monster!');
            // Tambahkan logika jika pemain kalah (mungkin mengurangi XP atau gold)
            return;
        }
    }
}

// Contoh panggilan fungsi battle dengan perintah
async function handleBattleCommand(message, location) {
    const player = {  // Contoh data pemain, sebaiknya ambil dari database
        level: 10,
        hp: 100,
        attack: 20,
        defense: 15
    };

    await startBattle(player, location);
}

module.exports = { handleBattleCommand };
