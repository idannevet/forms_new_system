import jsforce from 'jsforce';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test function to verify Salesforce credentials
async function testSalesforceConnection() {
  console.log('🔍 Testing Salesforce Connection...\n');
  
  // These will be your actual credentials
  const credentials = {
    username: process.env.SALESFORCE_USERNAME || 'your_username@example.com',
    password: process.env.SALESFORCE_PASSWORD || 'your_password',
    securityToken: process.env.SALESFORCE_SECURITY_TOKEN || 'your_security_token',
    loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
  };

  try {
    console.log('📡 Connecting to Salesforce...');
    console.log(`Login URL: ${credentials.loginUrl}`);
    console.log(`Username: ${credentials.username}`);
    
    const conn = new jsforce.Connection({
      loginUrl: credentials.loginUrl
    });

    // Test login
    const userInfo = await conn.login(
      credentials.username,
      credentials.password + credentials.securityToken
    );

    console.log('✅ Login successful!');
    console.log(`User ID: ${userInfo.id}`);
    console.log(`Organization ID: ${userInfo.organizationId}`);
    console.log(`Instance URL: ${conn.instanceUrl}`);
    console.log(`Access Token: ${conn.accessToken.substring(0, 20)}...`);

    // Get user details
    console.log('\n👤 User Information:');
    try {
      const user = await conn.sobject('User').retrieve(userInfo.id);
      console.log(`Name: ${user.Name || 'N/A'}`);
      console.log(`Email: ${user.Email || 'N/A'}`);
      
      // Try to get profile name if available
      if (user.Profile && user.Profile.Name) {
        console.log(`Profile: ${user.Profile.Name}`);
      } else {
        console.log('Profile: N/A (Profile relationship not accessible)');
      }
    } catch (userError) {
      console.log('⚠️  Could not retrieve detailed user information');
      console.log(`User Error: ${userError.message}`);
    }

    // Get organization details
    console.log('\n🏢 Organization Information:');
    try {
      const org = await conn.sobject('Organization').retrieve(userInfo.organizationId);
      console.log(`Organization Name: ${org.Name || 'N/A'}`);
      console.log(`Organization Type: ${org.OrganizationType || 'N/A'}`);
      console.log(`Instance Name: ${org.InstanceName || 'N/A'}`);
    } catch (orgError) {
      console.log('⚠️  Could not retrieve organization information');
      console.log(`Org Error: ${orgError.message}`);
    }

    // List available objects
    console.log('\n📋 Available Custom Objects:');
    try {
      const describeGlobal = await conn.describeGlobal();
      const customObjects = describeGlobal.sobjects.filter(obj => 
        obj.custom && obj.createable && obj.queryable
      );
      
      console.log(`Found ${customObjects.length} custom objects`);
      customObjects.slice(0, 10).forEach(obj => {
        console.log(`- ${obj.name} (${obj.label})`);
      });
      
      if (customObjects.length > 10) {
        console.log(`... and ${customObjects.length - 10} more`);
      }
    } catch (objError) {
      console.log('⚠️  Could not retrieve object list');
      console.log(`Object Error: ${objError.message}`);
    }

    // Test specific object if provided
    const testObjectName = process.env.TEST_OBJECT || 'Custom_Form_Submission__c';
    console.log(`\n🔍 Testing object: ${testObjectName}`);
    
    try {
      const objectDescribe = await conn.sobject(testObjectName).describe();
      console.log(`✅ Object "${testObjectName}" exists and is accessible`);
      console.log(`Fields available: ${objectDescribe.fields.length}`);
      
      // Show first 10 fields
      console.log('\n📝 Sample Fields:');
      objectDescribe.fields.slice(0, 10).forEach(field => {
        console.log(`- ${field.name} (${field.type}) - ${field.label}`);
      });
      
      if (objectDescribe.fields.length > 10) {
        console.log(`... and ${objectDescribe.fields.length - 10} more fields`);
      }
      
    } catch (error) {
      console.log(`❌ Object "${testObjectName}" not found or not accessible`);
      console.log(`Error: ${error.message}`);
      
      // Try to suggest alternatives
      try {
        const describeGlobal = await conn.describeGlobal();
        const customObjects = describeGlobal.sobjects.filter(obj => 
          obj.custom && obj.createable && obj.queryable
        );
        
        console.log('\n💡 Available custom objects you can use:');
        customObjects.slice(0, 5).forEach(obj => {
          console.log(`- ${obj.name} (${obj.label})`);
        });
      } catch (suggestError) {
        console.log('Could not retrieve object suggestions');
      }
    }

    console.log('\n🎉 Salesforce connection test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`✅ Login: Working`);
    console.log(`✅ Instance: ${conn.instanceUrl}`);
    console.log(`✅ User: ${userInfo.id}`);
    console.log(`✅ Organization: ${userInfo.organizationId}`);
    
    return true;

  } catch (error) {
    console.error('❌ Salesforce connection failed:');
    console.error('Error:', error.message);
    
    if (error.name === 'INVALID_LOGIN') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Check your username and password');
      console.log('2. Verify your security token');
      console.log('3. Make sure you\'re using the correct login URL');
      console.log('4. Check if your IP is whitelisted in Salesforce');
    }
    
    return false;
  }
}

// Run the test
testSalesforceConnection()
  .then(success => {
    if (success) {
      console.log('\n✅ Ready to proceed with form integration!');
    } else {
      console.log('\n❌ Please fix the credentials and try again.');
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
  }); 