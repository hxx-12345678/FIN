/**
 * Check if tables and columns exist
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
  try {
    // Check user_preferences
    const userPrefs = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_preferences'
      ORDER BY column_name;
    `;
    console.log('\nuser_preferences columns:');
    console.log(userPrefs);

    // Check org_details
    const orgDetails = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'org_details'
      ORDER BY column_name;
    `;
    console.log('\norg_details columns:');
    console.log(orgDetails);

    // Check localization_settings
    const locSettings = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'localization_settings'
      ORDER BY column_name;
    `;
    console.log('\nlocalization_settings columns:');
    console.log(locSettings);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();

