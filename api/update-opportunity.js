import jsforce from 'jsforce';
import formidable from 'formidable';

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

    // Prepare field updates for the Opportunity
    const opportunityUpdates = {
      Id: opportunityId
    };

    // Set all checkbox fields to true for the specific form type
    const fieldsToUpdate = checkboxFields[formType] || [];
    fieldsToUpdate.forEach(field => {
      opportunityUpdates[field] = true;
    });

    // Update the Opportunity record
    const updateResult = await conn.sobject('Opportunity').update(opportunityUpdates);
    
    if (!updateResult.success) {
      return res.status(400).json({ 
        success: false, 
        error: 'Failed to update Opportunity',
        details: updateResult.errors 
      });
    }

    // Log all received file field names for debugging
    console.log('[FILES] Received file fields:', Object.keys(files));

    // Hebrew field labels for file names
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
    const generatedFileNames = [];
    const uploadedFiles = [];
    for (const [fieldName, fileArray] of Object.entries(files)) {
      // Handle owner file fields like owner[0][idPhoto]
      const ownerMatch = fieldName.match(/^owner\[(\d+)\]\[idPhoto\]$/);
      let fieldLabel = hebrewFieldLabels[fieldName] || fieldName;
      if (ownerMatch) {
        const ownerIndex = parseInt(ownerMatch[1], 10) + 1;
        fieldLabel = `צילום ת"ז בעלים ${ownerIndex}`;
      }
      // Only process as array if it's an array, else as single file, not both
      if (Array.isArray(fileArray)) {
        for (let idx = 0; idx < fileArray.length; idx++) {
          const file = fileArray[idx];
          if (file && file.filepath) {
            try {
              const fs = await import('fs');
              const fileContent = fs.readFileSync(file.filepath);
              const fileExtension = file.originalFilename ? 
                file.originalFilename.split('.').pop() : 'pdf';
              const newFileName = `${fieldLabel}${fileArray.length > 1 ? `_${idx+1}` : ''}.${fileExtension}`;
              generatedFileNames.push(newFileName);
              console.log(`[PROCESS] fieldName=${fieldName}, idx=${idx}, newFileName=${newFileName}`);
              const payload = {
                Title: newFileName,
                PathOnClient: newFileName,
                VersionData: fileContent.toString('base64'),
                FirstPublishLocationId: Array.isArray(opportunityId) ? opportunityId[0] : opportunityId
              };
              console.log('[PAYLOAD]', {
                ...payload,
                VersionData: payload.VersionData.substring(0, 30) + '...'
              });
              const contentVersion = await conn.sobject('ContentVersion').create(payload);
              if (contentVersion.success) {
                console.log(`[UPLOAD] Success: ${newFileName} (ContentVersionId: ${contentVersion.id})`);
                uploadedFiles.push({
                  fieldName,
                  fieldLabel,
                  originalFileName: file.originalFilename,
                  newFileName: newFileName,
                  contentVersionId: contentVersion.id
                });
              } else {
                console.error(`[UPLOAD] Failed: ${newFileName}`, contentVersion.errors);
              }
            } catch (fileError) {
              console.error(`[UPLOAD] Error uploading file ${fieldName}:`, fileError);
            }
          }
        }
      } else if (fileArray && fileArray.filepath) {
        const file = fileArray;
        try {
          const fs = await import('fs');
          const fileContent = fs.readFileSync(file.filepath);
          const fileExtension = file.originalFilename ? 
            file.originalFilename.split('.').pop() : 'pdf';
          const newFileName = `${fieldLabel}.${fileExtension}`;
          generatedFileNames.push(newFileName);
          console.log(`[PROCESS] fieldName=${fieldName}, newFileName=${newFileName}`);
          const payload = {
            Title: newFileName,
            PathOnClient: newFileName,
            VersionData: fileContent.toString('base64'),
            FirstPublishLocationId: Array.isArray(opportunityId) ? opportunityId[0] : opportunityId
          };
          console.log('[PAYLOAD]', {
            ...payload,
            VersionData: payload.VersionData.substring(0, 30) + '...'
          });
          const contentVersion = await conn.sobject('ContentVersion').create(payload);
          if (contentVersion.success) {
            console.log(`[UPLOAD] Success: ${newFileName} (ContentVersionId: ${contentVersion.id})`);
            uploadedFiles.push({
              fieldName,
              fieldLabel,
              originalFileName: file.originalFilename,
              newFileName: newFileName,
              contentVersionId: contentVersion.id
            });
          } else {
            console.error(`[UPLOAD] Failed: ${newFileName}`, contentVersion.errors);
          }
        } catch (fileError) {
          console.error(`[UPLOAD] Error uploading file ${fieldName}:`, fileError);
        }
      }
    }
    // Log all generated file names for debugging
    console.log('[FILES] Generated file names:', generatedFileNames);

    res.status(200).json({ 
      success: true, 
      message: 'Opportunity updated successfully',
      formType: formType,
      opportunityId: opportunityId,
      checkboxFieldsUpdated: fieldsToUpdate,
      filesUploaded: uploadedFiles.length,
      uploadedFiles: uploadedFiles
    });

  } catch (error) {
    console.error('Error updating opportunity:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
}