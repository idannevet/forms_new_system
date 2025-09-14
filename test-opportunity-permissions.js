import dotenv from 'dotenv';
import jsforce from 'jsforce';

// Load environment variables
dotenv.config();

async function testOpportunityPermissions() {
  console.log('🔍 Testing Salesforce permissions for Opportunity updates and file uploads...\n');

  try {
    // Connect to Salesforce
    const conn = new jsforce.Connection({
      loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
    });

    console.log('📡 Connecting to Salesforce...');
    const userInfo = await conn.login(
      process.env.SALESFORCE_USERNAME,
      process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN
    );
    console.log('✅ Connected successfully!');
    console.log(`👤 User: ${userInfo.display_name} (${userInfo.username})`);
    console.log(`🏢 Org: ${userInfo.organization_name}\n`);

    // Test Opportunity access
    console.log('\n🔍 Test 1: Checking Opportunity access...');
    try {
      const opportunities = await conn.sobject('Opportunity').find({}, 'Id, Name, StageName').limit(1);
      console.log('✅ Can query Opportunities');
      if (opportunities.length > 0) {
        console.log(`📋 Sample Opportunity: ${opportunities[0].Name} (${opportunities[0].Id})`);
      }
    } catch (error) {
      console.log('❌ Cannot query Opportunities:', error.message);
      return;
    }

    // Test ContentVersion permissions
    console.log('\n🔍 Test 2: Checking ContentVersion (file upload) permissions...');
    try {
      const contentVersions = await conn.sobject('ContentVersion').find({}, 'Id, Title').limit(1);
      console.log('✅ Can query ContentVersion (file uploads should work)');
    } catch (error) {
      console.log('❌ Cannot query ContentVersion:', error.message);
      console.log('⚠️  File uploads may not work - contact your Salesforce admin');
    }

    // Test 4: Check user profile and permissions
    console.log('\n🔍 Test 4: Checking user profile and permissions...');
    try {
      const user = await conn.sobject('User').findOne(
        { Id: userInfo.id },
        'Profile.Name, UserRole.Name, IsActive, UserPermissionsApiUser'
      );
      console.log(`👤 Profile: ${user.Profile?.Name || 'N/A'}`);
      console.log(`🎭 Role: ${user.UserRole?.Name || 'N/A'}`);
      console.log(`✅ Active: ${user.IsActive}`);
      console.log(`🔌 API Access: ${user.UserPermissionsApiUser}`);
    } catch (error) {
      console.log('⚠️  Cannot check user details:', error.message);
    }

    // Test 5: Check field-level security for common Opportunity fields
    console.log('\n🔍 Test 5: Checking field access...');
    try {
      const opportunities = await conn.sobject('Opportunity').find({}, 'Id, Name, StageName, Amount, CloseDate, Description').limit(1);
      if (opportunities.length > 0) {
        console.log('✅ Can access common Opportunity fields');
        const opp = opportunities[0];
        console.log(`   - Name: ${opp.Name}`);
        console.log(`   - Stage: ${opp.StageName}`);
        console.log(`   - Amount: ${opp.Amount}`);
        console.log(`   - Close Date: ${opp.CloseDate}`);
      }
    } catch (error) {
      console.log('❌ Cannot access Opportunity fields:', error.message);
    }

    console.log('\n🎉 Permission test completed!');
    console.log('\n📋 Summary:');
    console.log('✅ Basic connection: Working');
    console.log('✅ Opportunity query: Working');
    console.log('⚠️  File uploads: Check ContentVersion permissions above');
    console.log('⚠️  Field updates: Check field access above');
    
    console.log('\n💡 If you see any ❌ errors above, you may need to:');
    console.log('   1. Contact your Salesforce admin to grant permissions');
    console.log('   2. Ensure your user has "API Enabled" permission');
    console.log('   3. Check field-level security for specific fields');
    console.log('   4. Verify you have "Create" permission on ContentVersion for file uploads');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your .env file has correct credentials');
    console.log('   2. Verify your Salesforce login URL');
    console.log('   3. Ensure your user is active and has API access');
  }
}

testOpportunityPermissions(); 