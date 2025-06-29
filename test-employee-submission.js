// Test file for employee submission functionality
const testData = {
  opportunityId: '006XXXXXXXXXXXXXXX', // Replace with actual opportunity ID
  employees: [
    {
      firstNameHebrew: 'יוסי',
      lastNameHebrew: 'כהן',
      firstNameEnglish: 'Yossi',
      lastNameEnglish: 'Cohen',
      idNumber: '123456789',
      phoneNumber: '0501234567',
      city: 'תל אביב',
      recruitingCompany: 'חברה מגייסת א',
      floorClub: 'מטלון 264',
      decision: '',
      declaration: true,
      email: 'yossi.cohen@example.com'
    },
    {
      firstNameHebrew: 'שרה',
      lastNameHebrew: 'לוי',
      firstNameEnglish: 'Sara',
      lastNameEnglish: 'Levy',
      idNumber: '987654321',
      phoneNumber: '0529876543',
      city: 'ירושלים',
      recruitingCompany: 'חברה מגייסת ב',
      floorClub: 'מטלון 264',
      decision: '',
      declaration: false,
      email: 'sara.levy@example.com'
    }
  ]
};

// Test the API endpoint
async function testEmployeeSubmission() {
  try {
    const response = await fetch('/api/submit-employees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('Test Result:', result);
    
    if (result.success) {
      console.log('✅ Test passed! Employees submitted successfully');
      console.log('Created contacts:', result.results.length);
    } else {
      console.log('❌ Test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Export for use in other test files
module.exports = {
  testData,
  testEmployeeSubmission
};

// Run test if this file is executed directly
if (require.main === module) {
  console.log('Testing employee submission...');
  testEmployeeSubmission();
} 