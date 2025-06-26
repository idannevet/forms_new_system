import jsforce from 'jsforce';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const formData = req.body;
    console.log('Received form data:', formData);

    // Get the opportunity ID and form type from the form
    const opportunityId = formData.record_id;
    const formType = formData.form_type; // 'ern_open' or 'eligibility_check'
    const operation = formData.operation; // 'upload_files_only' or undefined
    
    if (!opportunityId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Opportunity ID (record_id) is required' 
      });
    }

    if (!formType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Form type (form_type) is required' 
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

    // Define checkbox fields for each form type
    const checkboxFields = {
      ern_open: [
        'three_month_bank_sheets__c',
        'copmany_bank_valid__c',
        'owner_id_oppurtunity__c',
        'company_federal_doc__c',
        'opportunity_signiture_owner__c'
      ],
      eligibility_check: [
        'company_federal_doc__c',
        'owner_id_oppurtunity__c',
        'opportunity_signiture_owner__c',
        'company_doc_2024__c',
        'company_doc_2025__c',
        'company_doc_2023__c',
        'ricuz_itrut__c',
        'copmany_bank_valid__c'
      ]
    };

    let opportunityUpdated = false;

    // CALL 1: Update the Opportunity record (only if not file-only operation)
    if (operation !== 'upload_files_only') {
      console.log('[CALL 1] Updating Opportunity record...');
      const opportunityUpdates = {
        Id: opportunityId
      };

      // Set all checkbox fields to true for the specific form type
      const fieldsToUpdate = checkboxFields[formType] || [];
      fieldsToUpdate.forEach(field => {
        opportunityUpdates[field] = true;
      });

      const updateResult = await conn.sobject('Opportunity').update(opportunityUpdates);
      
      if (!updateResult.success) {
        return res.status(400).json({ 
          success: false, 
          error: 'Failed to update Opportunity',
          details: updateResult.errors 
        });
      }
      
      console.log('[CALL 1] Opportunity updated successfully');
      opportunityUpdated = true;
    } else {
      console.log('[SKIP] Skipping Opportunity update (file-only operation)');
    }

    // For now, skip file uploads since we need to handle them differently
    // We'll implement file uploads in a separate step once the basic API is working

    // Prepare response
    const response = {
      success: true,
      message: opportunityUpdated ? 'Opportunity updated successfully' : 'Operation completed successfully',
      formType: formType,
      opportunityId: opportunityId,
      operation: operation,
      opportunityUpdated: opportunityUpdated,
      filesUploaded: 0,
      filesFailed: 0,
      uploadedFiles: [],
      failedFiles: []
    };

    // Add checkbox fields info if opportunity was updated
    if (opportunityUpdated) {
      const fieldsToUpdate = checkboxFields[formType] || [];
      response.checkboxFieldsUpdated = fieldsToUpdate;
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Error updating opportunity:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
}