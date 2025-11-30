// scripts/seedDepots.js
const Depot = require('../src/models/depot.models.js');
const { connectDB } = require('../src/utils/db.js');
require('dotenv').config();

// All Main Depots (24)
const mainDepots = [
    { name: 'AMBALA', code: 'AMB', district: 'AMBALA', commencementDate: '1950-09-07' },
    { name: 'CHANDIGARH', code: 'CHD', district: 'CHANDIGARH', commencementDate: '1963-04-12' },
    { name: 'KARNAL', code: 'KRL', district: 'KARNAL', commencementDate: '1969-07-15' },
    { name: 'JIND', code: 'JIND', district: 'JIND', commencementDate: '1973-01-01' },
    { name: 'KAITHAL', code: 'KTL', district: 'KAITHAL', commencementDate: '1974-08-24' },
    { name: 'SONIPAT', code: 'SNP', district: 'SONIPAT', commencementDate: '1979-10-22' },
    { name: 'YAMUNANAGAR', code: 'YNR', district: 'YAMUNANAGAR', commencementDate: '1979-11-29' },
    { name: 'DELHI', code: 'DEL', district: 'DELHI', commencementDate: '1984-04-01' },
    { name: 'KURUKSHETRA', code: 'KKR', district: 'KURUKSHETRA', commencementDate: '1990-01-06' },
    { name: 'PANIPAT', code: 'PNP', district: 'PANIPAT', commencementDate: '1993-01-10' },
    { name: 'GURUGRAM', code: 'GUR', district: 'GURUGRAM', commencementDate: '1950-09-01' },
    { name: 'ROHTAK', code: 'ROH', district: 'ROHTAK', commencementDate: '1967-04-01' },
    { name: 'HISAR', code: 'HSR', district: 'HISAR', commencementDate: '1969-08-11' },
    { name: 'REWARI', code: 'REW', district: 'REWARI', commencementDate: '1972-12-01' },
    { name: 'BHIWANI', code: 'BHI', district: 'BHIWANI', commencementDate: '1975-11-01' },
    { name: 'SIRSA', code: 'SIR', district: 'SIRSA', commencementDate: '1978-04-01' },
    { name: 'FARIDABAD', code: 'FBD', district: 'FARIDABAD', commencementDate: '1981-04-01' },
    { name: 'FATEHABAD', code: 'FTB', district: 'FATEHABAD', commencementDate: '1989-02-15' },
    { name: 'JHAJJAR', code: 'JHR', district: 'JHAJJAR', commencementDate: '2001-04-01' },
    { name: 'NARNAUL', code: 'NRL', district: 'MAHENDRAGARH', commencementDate: '1997-04-01' },
    { name: 'CHARKHI DADRI', code: 'CDD', district: 'CHARKHI DADRI', commencementDate: '2011-07-01' },
    { name: 'PALWAL', code: 'PAL', district: 'PALWAL', commencementDate: '2012-06-01' },
    { name: 'NUH', code: 'NUH', district: 'NUH', commencementDate: '2013-01-01' },
    { name: 'FBD(CBS)', code: 'FBDCBS', district: 'FARIDABAD', commencementDate: '2012-04-01' }
];

// All Sub-Depots with correct parent mapping
const subDepots = [
    { name: 'NARAINGARH', code: 'NAR', district: 'AMBALA', parentName: 'AMBALA' },
    { name: 'KALKA', code: 'KLK', district: 'PANCHKULA', parentName: 'CHANDIGARH' },
    { name: 'PANCHKULA', code: 'PKL', district: 'PANCHKULA', parentName: 'CHANDIGARH' },
    { name: 'NARWANA', code: 'NRW', district: 'JIND', parentName: 'JIND' },
    { name: 'SAFIDON', code: 'SFD', district: 'JIND', parentName: 'JIND' },
    { name: 'GOHANA', code: 'GOH', district: 'SONIPAT', parentName: 'SONIPAT' },
    { name: 'PEHOWA', code: 'PEH', district: 'KURUKSHETRA', parentName: 'KURUKSHETRA' },
    { name: 'HANSI', code: 'HNS', district: 'HISAR', parentName: 'HISAR' },
    { name: 'TOSHAM', code: 'TSM', district: 'BHIWANI', parentName: 'BHIWANI' },
    { name: 'DABWALI', code: 'DBW', district: 'SIRSA', parentName: 'SIRSA' },
    { name: 'TOHANA', code: 'TOH', district: 'FATEHABAD', parentName: 'FATEHABAD' },
    { name: 'BAHADURGARH', code: 'BHG', district: 'JHAJJAR', parentName: 'JHAJJAR' },
    { name: 'LOHARU', code: 'LHR', district: 'BHIWANI', parentName: 'BHIWANI' },
    { name: 'KOSLI', code: 'KOS', district: 'REWARI', parentName: 'REWARI' },
    { name: 'BARARA', code: 'BAR', district: 'AMBALA', parentName: 'AMBALA' },
    { name: 'NILOKHERI', code: 'NLK', district: 'KARNAL', parentName: 'KARNAL' },
    { name: 'ASSANDH', code: 'ASD', district: 'KARNAL', parentName: 'KARNAL' }
    // Add more if needed
];

const seed = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        // Clear old data (run only once!)
        await Depot.deleteMany({});
        console.log('Cleared existing depots');

        // Create all main depots
        const createdMain = await Depot.create(
            mainDepots.map(d => ({
                ...d,
                type: 'main',
                parentDepot: null
            }))
        );
        console.log(`Created ${createdMain.length} main depots`);

        // Build map: name → _id
        const depotMap = {};
        createdMain.forEach(d => {
            depotMap[d.name] = d._id;
        });

        // Create sub-depots with correct parentDepot reference
        const subWithParent = subDepots.map(sub => {
            const parentId = depotMap[sub.parentName];
            if (!parentId) {
                console.warn(`Warning: Parent depot not found for ${sub.name} → ${sub.parentName}`);
            }
            return {
                name: sub.name,
                code: sub.code,
                type: 'sub',
                district: sub.district,
                parentDepot: parentId || null,
                commencementDate: sub.commencementDate || null
            };
        });

        const createdSub = await Depot.create(subWithParent);
        console.log(`Created ${createdSub.length} sub-depots`);

        console.log('Haryana Roadways Depots & Sub-Depots seeded successfully!');
        console.log(`Total Depots: ${createdMain.length + createdSub.length}`);
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error.message);
        process.exit(1);
    }
};

seed();