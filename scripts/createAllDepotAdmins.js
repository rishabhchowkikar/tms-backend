require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Depot = require('../src/models/depot.models');
const Admin = require('../src/models/admin.models');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ ERROR: MONGO_URI is not defined in .env file!');
    process.exit(1);
}

async function createAllDepotAdmins() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        console.log(`   URI: ${MONGO_URI}\n`);

        await mongoose.connect(MONGO_URI, { dbName: 'tms-db' });
        console.log('✅ Connected successfully!\n');

        const dbName = mongoose.connection.db.databaseName;
        console.log(`📊 Current database: "${dbName}"\n`);

        // Count total and active depots
        const totalDepots = await Depot.countDocuments({});
        const activeDepots = await Depot.countDocuments({ isActive: true });

        console.log(`🔢 Total depots: ${totalDepots}`);
        console.log(`🟢 Active depots: ${activeDepots}\n`);

        if (totalDepots === 0) {
            console.log('⚠️ No depots found! Exiting.');
            return;
        }

        // Fetch all active depots
        const depots = await Depot.find({ isActive: true })
            .select('name code type district _id')
            .sort({ name: 1 })
            .lean();

        console.log(`📋 Processing ${depots.length} active depots:\n`);

        let created = 0;
        let skipped = 0;

        for (const depot of depots) {
            const cleanName = depot.name.trim().toLowerCase().replace(/\s+/g, '');
            const adminName = `${depot.name} Admin`;
            const email = `${cleanName}admin@gmail.com`;
            const password = email;

            console.log(`🔍 Checking for depot: ${depot.name} (${depot.code})`);

            // Skip if email exists
            if (await Admin.findOne({ email }).lean()) {
                console.log(`   ⏭️ Skipped: Email ${email} already used.`);
                skipped++;
                continue;
            }

            // Skip if depot has admin
            if (await Admin.findOne({ depotId: depot._id, role: 'admin' }).lean()) {
                console.log(`   ⏭️ Skipped: Depot already assigned an admin.`);
                skipped++;
                continue;
            }

            // Create new admin
            const passwordHash = await bcrypt.hash(password, 10);
            await Admin.create({
                adminname: adminName,
                email,
                passwordHash,
                role: 'admin',
                depotId: depot._id
            });

            console.log(`   ✅ Created: ${adminName} (${email})`);
            created++;
        }

        console.log('\n🎉 Summary:');
        console.log(`✅ Created: ${created} admins`);
        console.log(`⏭️ Skipped: ${skipped}`);
        console.log('Done!');

    } catch (error) {
        console.error('\n💥 Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected.');
    }
}

createAllDepotAdmins();