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

    const results = [];
    const errors = [];

    // Get the company (AccountId) from the opportunity
    const oppResult = await conn.sobject('Opportunity').retrieve(opportunityId);
    const companyId = oppResult.AccountId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Could not find related company (Account) for this opportunity'
      });
    }

    // Process each employee
    for (const employee of employees) {
      try {
        // Check for existing Contact by phone number
        const existingContacts = await conn.sobject('Contact')
          .find({ Phone: employee.phoneNumber }, 'Id')
          .limit(1)
          .execute();

        let contactId;
        if (existingContacts.length > 0) {
          // Use existing Contact
          contactId = existingContacts[0].Id;
          console.log(`Existing contact found for phone ${employee.phoneNumber}: ${contactId}`);
        } else {
          // Create Contact record with AccountId and extra fields
          const contactData = {
            FirstName: employee.firstNameHebrew,
            LastName: employee.lastNameHebrew,
            Phone: employee.phoneNumber,
            Email: employee.email,
            JobTitle__c: 'עובד',
            AccountId: companyId,
            title_level__c: 'נציג',
            Field1__c: 'עובד'
          };
          console.log('Attempting to create contact with data:', contactData);

          const contactResult = await conn.sobject('Contact').create(contactData);
          console.log('Salesforce contact creation result:', contactResult);

          if (contactResult.success) {
            contactId = contactResult.id;
            console.log(`Contact created successfully: ${contactId}`);
          } else {
            console.error('Failed to create contact:', contactResult.errors);
            errors.push({
              employee: employee,
              error: 'Failed to create contact',
              details: contactResult.errors
            });
            continue; // Skip to next employee
          }
        }

        // Create Opportunity Contact Role
        const contactRoleData = {
          OpportunityId: opportunityId,
          ContactId: contactId,
          Role: 'Employee',
          IsPrimary: false
        };

        const contactRoleResult = await conn.sobject('OpportunityContactRole').create(contactRoleData);

        if (contactRoleResult.success) {
          results.push({
            contactId: contactId,
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
      const webhookData = {
        opportunityId: opportunityId,
        employees: employees,
        submissionDate: new Date().toISOString()
      };

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