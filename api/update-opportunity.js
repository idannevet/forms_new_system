import jsforce from 'jsforce';
import formidable from 'formidable';

// Disable body parsing, we'll handle it with formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to upload files in batches
async function uploadFilesInBatches(conn, files, opportunityId, hebrewFieldLabels, batchSize = 2) {
  const fileEntries = Object.entries(files);
  const batches = [];
  
  // Split files into batches
  for (let i = 0; i < fileEntries.length; i += batchSize) {
    batches.push(fileEntries.slice(i, i + batchSize));
  }
  
  console.log(`[BATCHES] Split ${fileEntries.length} files into ${batches.length} batches of ${batchSize} files each`);
  
  const uploadedFiles = [];
  const failedFiles = [];
  
  // Process each batch
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`[BATCH ${batchIndex + 1}/${batches.length}] Processing ${batch.length} files`);
    
    const batchPromises = batch.map(async ([fieldName, fileArray]) => {
      // Handle owner file fields like owner[0][idPhoto]
      const ownerMatch = fieldName.match(/^owner\[(\d+)\]\[idPhoto\]$/);
      let fieldLabel = hebrewFieldLabels[fieldName] || fieldName;
      if (ownerMatch) {
        const ownerIndex = parseInt(ownerMatch[1], 10) + 1;
        fieldLabel = `צילום ת"ז בעלים ${ownerIndex}`;
      }
      
      // Get the file (handle both array and single file cases)
      let file;
      if (Array.isArray(fileArray)) {
        file = fileArray[0];
      } else {
        file = fileArray;
      }
      
      if (!file || !file.filepath) {
        console.log(`[SKIP] No file found for field: ${fieldName}`);
        return null;
      }
      
      try {
        const fs = await import('fs');
        const fileContent = fs.readFileSync(file.filepath);
        const fileExtension = file.originalFilename ? 
          file.originalFilename.split('.').pop() : 'pdf';
        const newFileName = `${fieldLabel}.${fileExtension}`;
        
        console.log(`[UPLOAD] fieldName=${fieldName}, newFileName=${newFileName}`);
        
        const payload = {
          Title: newFileName,
          PathOnClient: newFileName,
          VersionData: fileContent.toString('base64'),
          FirstPublishLocationId: Array.isArray(opportunityId) ? opportunityId[0] : opportunityId
        };
        
        const contentVersion = await conn.sobject('ContentVersion').create(payload);
        
        if (contentVersion.success) {
          console.log(`[SUCCESS] ${newFileName} (ContentVersionId: ${contentVersion.id})`);
          return {
            fieldName,
            fieldLabel,
            originalFileName: file.originalFilename,
            newFileName: newFileName,
            contentVersionId: contentVersion.id
          };
        } else {
          console.error(`[FAILED] ${newFileName}`, contentVersion.errors);
          return {
            fieldName,
            fieldLabel,
            originalFileName: file.originalFilename,
            newFileName: newFileName,
            error: contentVersion.errors
          };
        }
      } catch (fileError) {
        console.error(`[ERROR] Uploading file ${fieldName}:`, fileError);
        return {
          fieldName,
          fieldLabel,
          originalFileName: file.originalFilename,
          error: fileError.message
        };
      }
    });
    
    // Wait for all files in this batch to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Process results
    batchResults.forEach(result => {
      if (result) {
        if (result.error) {
          failedFiles.push(result);
        } else {
          uploadedFiles.push(result);
        }
      }
    });
    
    console.log(`[BATCH ${batchIndex + 1}] Completed: ${batchResults.filter(r => r && !r.error).length} success, ${batchResults.filter(r => r && r.error).length} failed`);
    
    // Add a small delay between batches to avoid overwhelming the API
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return { uploadedFiles, failedFiles };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data including files
    const form = formidable({ multiples: true });
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // Get the opportunity ID and form type from the form
    const opportunityId = fields.record_id;
    const formType = fields.form_type; // 'ern_open' or 'eligibility_check'
    
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

    // CALL 1: Update the Opportunity record
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

    // CALL 2: Upload files in batches
    console.log('[CALL 2] Starting file uploads...');
    const hebrewFieldLabels = {
      'certificate': 'תעודת התאגדות',
      'bankStatements': '3 חודשים עובר ושב',
      'accountConfirmation': 'אישור קיום חשבון',
      'authorizedSignatory': 'מורשה חתימה',
      'balance2024': 'מאזן בוחן ל-2024',
      'balance2025': 'מאזן בוחן ל-2025',
      'audited2023': 'דוחות מבוקרים לשנת 2023',
      'bankBalances': 'דו"ח ריכוז יתרות מול הבנקים',
      // Add more as needed
    };

    const { uploadedFiles, failedFiles } = await uploadFilesInBatches(
      conn, 
      files, 
      opportunityId, 
      hebrewFieldLabels, 
      2 // Upload 2 files at a time
    );

    console.log(`[CALL 2] File uploads completed: ${uploadedFiles.length} success, ${failedFiles.length} failed`);

    // Prepare response
    const response = {
      success: true,
      message: 'Opportunity updated successfully',
      formType: formType,
      opportunityId: opportunityId,
      checkboxFieldsUpdated: fieldsToUpdate,
      filesUploaded: uploadedFiles.length,
      filesFailed: failedFiles.length,
      uploadedFiles: uploadedFiles,
      failedFiles: failedFiles
    };

    // If some files failed, still return success but include the failures
    if (failedFiles.length > 0) {
      response.message = `Opportunity updated successfully. ${uploadedFiles.length} files uploaded, ${failedFiles.length} files failed.`;
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