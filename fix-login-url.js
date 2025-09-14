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

async function fixLoginUrl() {
  console.log('🔧 Fixing Salesforce Login URL\n');
  
  try {
    // Read existing .env file
    if (!fs.existsSync('.env')) {
      console.log('❌ No .env file found. Run npm run setup first.');
      return;
    }
    
    const envContent = fs.readFileSync('.env', 'utf8');
    console.log('Current .env content:');
    console.log(envContent);
    
    console.log('\n📋 Login URL Options:');
    console.log('1. Production (https://login.salesforce.com)');
    console.log('2. Sandbox (https://test.salesforce.com)');
    console.log('3. Custom URL');
    
    const urlChoice = await question('Choose correct login URL (1, 2, or 3): ');
    
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
    
    // Update the .env file
    const updatedContent = envContent.replace(
      /SALESFORCE_LOGIN_URL=.*/,
      `SALESFORCE_LOGIN_URL=${loginUrl}`
    );
    
    fs.writeFileSync('.env', updatedContent);
    
    console.log('\n✅ Login URL updated in .env file');
    console.log(`🔗 New login URL: ${loginUrl}`);
    
    // Test the connection
    console.log('\n🧪 Testing connection...');
    
    // Load environment variables
    const dotenv = await import('dotenv');
    dotenv.config();
    
    // Import and run the test
    const { default: testConnection } = await import('./test-salesforce-credentials.js');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    rl.close();
  }
}

// Run fix
fixLoginUrl(); 