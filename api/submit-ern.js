import jsforce from 'jsforce';

// Disable body parsing, we'll handle it with formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const formData = req.body;

    // Connect to Salesforce
    const conn = new jsforce.Connection({
      loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
    });

    await conn.login(
      process.env.SALESFORCE_USERNAME,
      process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN
    );

    // Prepare data for Salesforce
    const salesforceData = {
      Business_Name__c: formData.businessName,
      Marketing_Name__c: formData.marketingName,
      Establishment_Date__c: formData.establishmentDate,
      Company_Number__c: formData.companyNumber,
      Business_Address__c: formData.businessAddress,
      Business_Sector__c: formData.businessSector,
      Owner_Email__c: formData.ownerEmail,
      Owner_Phone__c: formData.ownerPhone,
      Owner_Count__c: formData.ownerCount,
      Bank_Name__c: formData.bankName,
      Branch_Number__c: formData.branchNumber,
      Account_Number__c: formData.accountNumber,
      Form_Type__c: 'ERN_Open',
      Submission_Date__c: new Date().toISOString()
    };

    // Add owner details if present
    if (formData.owner && Array.isArray(formData.owner)) {
      formData.owner.forEach((owner, index) => {
        salesforceData[`Owner_${index + 1}_Name__c`] = owner.name;
        salesforceData[`Owner_${index + 1}_Phone__c`] = owner.phone;
        salesforceData[`Owner_${index + 1}_ID__c`] = owner.id;
      });
    }

    // Create or update record
    let result;
    if (formData.record_id) {
      result = await conn.sobject('Custom_Form_Submission__c').update({
        Id: formData.record_id,
        ...salesforceData
      });
    } else {
      result = await conn.sobject('Custom_Form_Submission__c').create(salesforceData);
    }

    if (result.success) {
      res.status(200).json({ 
        success: true, 
        message: 'Form submitted successfully',
        recordId: result.id 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Failed to save to Salesforce',
        details: result.errors 
      });
    }

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
} 