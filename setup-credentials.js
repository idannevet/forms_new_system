import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupCredentials() {
  console.log('🔧 Salesforce Credentials Setup\n');
  console.log('This will help you configure your Salesforce credentials for testing.\n');

  try {
    // Get credentials from user
    const username = await question('Enter your Salesforce username (email): ');
    const password = await question('Enter your Salesforce password: ');
    const securityToken = await question('Enter your Salesforce security token: ');
    
    console.log('\n📋 Login URL Options:');
    console.log('1. Production (https://login.salesforce.com)');
    console.log('2. Sandbox (https://test.salesforce.com)');
    console.log('3. Custom URL');
    
    const urlChoice = await question('Choose login URL (1, 2, or 3): ');
    
    let loginUrl;
    switch(urlChoice) {
      case '1':
        loginUrl = 'https://login.salesforce.com';
        break;
      case '2':
        loginUrl = 'https://test.salesforce.com';
        break;
      case '3':
        loginUrl = await question('Enter custom login URL: ');
        break;
      default:
        loginUrl = 'https://login.salesforce.com';
        console.log('Using production URL by default');
    }
    
    const testObject = await question('Enter the custom object name to test (press Enter for default): ') || 'Custom_Form_Submission__c';

    // Create .env file
    const envContent = `# Salesforce Credentials
SALESFORCE_USERNAME=${username}
SALESFORCE_PASSWORD=${password}
SALESFORCE_SECURITY_TOKEN=${securityToken}
SALESFORCE_LOGIN_URL=${loginUrl}

# Test Configuration
TEST_OBJECT=${testObject}
`;

    // Write to .env file
    fs.writeFileSync('.env', envContent);
    
    console.log('\n✅ Credentials saved to .env file');
    console.log('⚠️  IMPORTANT: Never commit .env file to git!');
    console.log(`🔗 Using login URL: ${loginUrl}`);
    
    // Test the connection
    console.log('\n🧪 Testing connection...');
    
    // Load environment variables
    const dotenv = await import('dotenv');
    dotenv.config();
    
    // Import and run the test
    const { default: testConnection } = await import('./test-salesforce-credentials.js');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

// Run setup
setupCredentials(); 