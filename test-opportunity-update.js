import dotenv from 'dotenv';
import jsforce from 'jsforce';

// Load environment variables
dotenv.config();

async function testOpportunityUpdate() {
  console.log('🧪 Testing Opportunity Update API...\n');

  try {
    // Connect to Salesforce
    const conn = new jsforce.Connection({
      loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
    });

    console.log('📡 Connecting to Salesforce...');
    await conn.login(
      process.env.SALESFORCE_USERNAME,
      process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN
    );
    console.log('✅ Connected successfully!\n');

    // Find a test Opportunity
    console.log('🔍 Finding a test Opportunity...');
    const opportunities = await conn.sobject('Opportunity').find({}, 'Id, Name, StageName').limit(1);
    
    if (opportunities.length === 0) {
      console.log('❌ No Opportunities found in your org');
      console.log('💡 Please create a test Opportunity first');
      return;
    }

    const testOpportunity = opportunities[0];
    console.log(`✅ Found Opportunity: ${testOpportunity.Name} (${testOpportunity.Id})\n`);

    // Test checkbox fields for ERN Open form
    console.log('🔍 Testing ERN Open form checkbox fields...');
    const ernOpenFields = [
      'three_month_bank_sheets__c',
      'copmany_bank_valid__c',
      'owner_id_oppurtunity__c',
      'company_federal_doc__c',
      'opportunity_signiture_owner__c'
    ];

    // Check if fields exist
    for (const field of ernOpenFields) {
      try {
        const result = await conn.sobject('Opportunity').describe();
        const fieldExists = result.fields.some(f => f.name === field);
        console.log(`${fieldExists ? '✅' : '❌'} ${field}`);
      } catch (error) {
        console.log(`❌ ${field} - Error checking field`);
      }
    }

    // Test checkbox fields for Eligibility Check form
    console.log('\n🔍 Testing Eligibility Check form checkbox fields...');
    const eligibilityFields = [
      'company_federal_doc__c',
      'owner_id_oppurtunity__c',
      'opportunity_signiture_owner__c',
      'company_doc_2024__c',
      'company_doc_2025__c',
      'company_doc_2023__c',
      'ricuz_itrut__c',
      'copmany_bank_valid__c'
    ];

    // Check if fields exist
    for (const field of eligibilityFields) {
      try {
        const result = await conn.sobject('Opportunity').describe();
        const fieldExists = result.fields.some(f => f.name === field);
        console.log(`${fieldExists ? '✅' : '❌'} ${field}`);
      } catch (error) {
        console.log(`❌ ${field} - Error checking field`);
      }
    }

    console.log('\n🎉 Field check completed!');
    console.log('\n📋 Next steps:');
    console.log('1. If you see ❌ for any fields, they may not exist in your org');
    console.log('2. You can create these custom checkbox fields in Salesforce Setup');
    console.log('3. Or update the field names in the API code to match your org');
    console.log('4. Test the forms with a real Opportunity ID from the URL');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOpportunityUpdate(); 