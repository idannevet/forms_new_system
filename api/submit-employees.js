import jsforce from 'jsforce';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { opportunityId, employees } = req.body;

    if (!opportunityId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Opportunity ID is required' 
      });
    }

    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'At least one employee is required' 
      });
    }

    // Connect to Salesforce
    const conn = new jsforce.Connection({
      loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
    });

    await conn.login(
      process.env.SALESFORCE_USERNAME,
      process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN
    );

    // Get the company (בית עסק) from the opportunity
    const companyId = await getCompanyFromOpportunity(conn, opportunityId);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Could not find related business (בית עסק) for this opportunity'
      });
    }

    // Get the "עובדים" record type ID for contacts
    const employeeRecordTypeId = await getEmployeeRecordTypeId(conn);

    const results = [];
    const errors = [];
    const webhookData = {
      opportunityId: opportunityId,
      companyId: companyId,
      employees: employees,
      submissionDate: new Date().toISOString()
    };

    // Process each employee
    for (const employee of employees) {
      try {
        // Create Contact record with only the required fields
        const contactData = {
          FirstName: employee.firstNameHebrew, // Hebrew first name
          LastName: employee.lastNameHebrew,   // Hebrew last name
          Phone: employee.phoneNumber,         // Phone number
          Company__c: companyId,               // Lookup to בית עסק
          JobTitle__c: 'עובד',                 // Picklist value
          Email: employee.email,               // Email
          RecordTypeId: employeeRecordTypeId   // עובדים record type
        };

        const contactResult = await conn.sobject('Contact').create(contactData);

        if (contactResult.success) {
          // Create Opportunity Contact Role to link contact to opportunity
          const contactRoleData = {
            OpportunityId: opportunityId,
            ContactId: contactResult.id,
            Role: 'Employee',
            IsPrimary: false
          };

          const contactRoleResult = await conn.sobject('OpportunityContactRole').create(contactRoleData);

          if (contactRoleResult.success) {
            results.push({
              contactId: contactResult.id,
              contactRoleId: contactRoleResult.id,
              employee: employee
            });
          } else {
            errors.push({
              employee: employee,
              error: 'Failed to create contact role',
              details: contactRoleResult.errors
            });
          }
        } else {
          errors.push({
            employee: employee,
            error: 'Failed to create contact',
            details: contactResult.errors
          });
        }
      } catch (error) {
        console.error('Error processing employee:', error);
        errors.push({
          employee: employee,
          error: 'Processing error',
          details: error.message
        });
      }
    }

    // Send data to webhook
    try {
      const webhookResponse = await fetch('https://hook.eu2.make.com/qgsdbc94kgk1fmlva2p1inqrmrrnraxl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      });

      if (!webhookResponse.ok) {
        console.warn('Webhook call failed:', webhookResponse.status, webhookResponse.statusText);
      } else {
        console.log('Webhook data sent successfully');
      }
    } catch (webhookError) {
      console.error('Error sending webhook data:', webhookError);
      // Don't fail the entire request if webhook fails
    }

    // Return results
    if (results.length > 0) {
      res.status(200).json({
        success: true,
        message: `Successfully processed ${results.length} employees`,
        results: results,
        errors: errors.length > 0 ? errors : undefined,
        webhookSent: true
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'No employees were processed successfully',
        errors: errors
      });
    }

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Helper function to get company (בית עסק) from opportunity
async function getCompanyFromOpportunity(conn, opportunityId) {
  try {
    // Query the opportunity to get the related business (בית עסק)
    // You may need to adjust the field name based on your Salesforce setup
    const result = await conn.query(
      `SELECT AccountId, Account.Name FROM Opportunity WHERE Id = '${opportunityId}' LIMIT 1`
    );
    
    if (result.records.length > 0) {
      return result.records[0].AccountId;
    }
    
    // If AccountId is not the right field, try alternative field names
    const alternativeFields = ['Business__c', 'Company__c', 'בית_עסק__c'];
    for (const field of alternativeFields) {
      try {
        const altResult = await conn.query(
          `SELECT ${field} FROM Opportunity WHERE Id = '${opportunityId}' LIMIT 1`
        );
        if (altResult.records.length > 0 && altResult.records[0][field]) {
          return altResult.records[0][field];
        }
      } catch (fieldError) {
        console.warn(`Field ${field} not found:`, fieldError.message);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting company from opportunity:', error);
    return null;
  }
}

// Helper function to get "עובדים" Record Type ID for contacts
async function getEmployeeRecordTypeId(conn) {
  try {
    // Query for the "עובדים" record type for Contact object
    const result = await conn.query(
      "SELECT Id FROM RecordType WHERE SObjectType = 'Contact' AND Name = 'עובדים' LIMIT 1"
    );
    
    if (result.records.length > 0) {
      return result.records[0].Id;
    }
    
    // If "עובדים" record type not found, try alternative names
    const alternativeNames = ['Employees', 'Employee', 'עובד'];
    for (const name of alternativeNames) {
      const altResult = await conn.query(
        `SELECT Id FROM RecordType WHERE SObjectType = 'Contact' AND Name = '${name}' LIMIT 1`
      );
      if (altResult.records.length > 0) {
        console.log(`Using alternative record type: ${name}`);
        return altResult.records[0].Id;
      }
    }
    
    // If no specific record type found, return null to use default
    console.warn('Could not find "עובדים" record type, using default Contact record type');
    return null;
  } catch (error) {
    console.warn('Could not find Contact Record Type, using default:', error.message);
    return null;
  }
} 