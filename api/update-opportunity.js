// This file is now the correct API endpoint for /api/update-opportunity
import jsforce from 'jsforce';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Create a function to handle the multer middleware
const uploadMiddleware = upload.any();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data
    await new Promise((resolve, reject) => {
      uploadMiddleware(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Extract form data from req.body and files from req.files
    const formData = req.body;
    const files = req.files || [];
    
    console.log('Received form data:', formData);
    console.log('Received files:', files.map(f => ({ name: f.fieldname, filename: f.originalname })));

    // Debug: log all received files and their field names and sizes
    console.log('All received files:', files.map((f, idx) => ({ idx, field: f.fieldname, name: f.originalname, size: f.size })));

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

    // Define file field mappings for each form type
    const fileFieldMappings = {
      ern_open: {
        'certificate': 'תעודת התאגדות',
        'bankStatements': 'דפי בנק 3 חודשים',
        'accountConfirmation': 'אישור חשבון בנק',
        'authorizedSignatory': 'מורשה חתימה',
        'owner[0][idPhoto]': 'ת"ז בעלים 1',
        'owner[1][idPhoto]': 'ת"ז בעלים 2',
        'owner[2][idPhoto]': 'ת"ז בעלים 3',
        'owner[3][idPhoto]': 'ת"ז בעלים 4',
        'owner[4][idPhoto]': 'ת"ז בעלים 5'
      },
      eligibility_check: {
        'certificate': 'תעודת התאגדות',
        'balance2024': 'מאזן 2024',
        'balance2025': 'מאזן 2025',
        'audited2023': 'מאזן מבוקר 2023',
        'accountConfirmation': 'אישור חשבון בנק',
        'authorizedSignatory': 'מורשה חתימה',
        'bankBalances': 'דפי בנק',
        'owner[0][idPhoto]': 'ת"ז בעלים 1',
        'owner[1][idPhoto]': 'ת"ז בעלים 2',
        'owner[2][idPhoto]': 'ת"ז בעלים 3',
        'owner[3][idPhoto]': 'ת"ז בעלים 4',
        'owner[4][idPhoto]': 'ת"ז בעלים 5'
      }
    };

    let opportunityUpdated = false;
    let filesUploaded = 0;
    let filesFailed = 0;
    const uploadedFiles = [];
    const failedFiles = [];

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

    // CALL 2: Upload files to Salesforce
    console.log('[CALL 2] Processing file uploads...');
    
    if (files.length > 0) {
      const fileMappings = fileFieldMappings[formType] || {};
      
      // Utility to sanitize filenames (remove problematic chars, ensure UTF-8)
      function sanitizeFilename(filename) {
        return filename
          .replace(/[^\w\u0590-\u05FF\u0600-\u06FF\d.\-_ ]+/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      // Group files by field name
      const filesByField = {};
      for (const file of files) {
        if (!filesByField[file.fieldname]) filesByField[file.fieldname] = [];
        filesByField[file.fieldname].push(file);
      }

      // Process files
      for (const [fieldName, fileArr] of Object.entries(filesByField)) {
        // Allow multiple for bankStatements and owner[n][idPhoto]
        const isOwnerIdPhoto = /^owner\[\d+\]\[idPhoto\]$/.test(fieldName);
        const isBankStatements = fieldName === 'bankStatements';
        const isAuthorizedSignatory = fieldName === 'authorizedSignatory';
        if (isBankStatements) {
          // Upload all files for these fields
          for (const file of fileArr) {
            await uploadFileToSalesforce(file, fieldName);
          }
        } else if (isOwnerIdPhoto) {
          // Only upload the first file for each owner[n][idPhoto] (deduplicate)
          await uploadFileToSalesforce(fileArr[0], fieldName);
        } else if (isAuthorizedSignatory) {
          // Always upload the authorizedSignatory file (should only be one)
          await uploadFileToSalesforce(fileArr[0], fieldName);
        } else {
          // For all other fields, only upload the first file
          await uploadFileToSalesforce(fileArr[0], fieldName);
        }
      }

      // Helper function to upload a file
      async function uploadFileToSalesforce(file, fieldName) {
        try {
          const displayName = fileMappings[fieldName] || fieldName;
          const safeOriginalName = sanitizeFilename(file.originalname);
          const title = `${displayName} - ${safeOriginalName}`;
          const uniqueId = `${Date.now()}-${Math.floor(Math.random()*10000)}`;
          console.log(`[UPLOAD ${uniqueId}] Uploading file: ${fieldName} - ${safeOriginalName} (${file.size} bytes)`);
          const contentVersion = {
            Title: title,
            PathOnClient: safeOriginalName,
            VersionData: file.buffer.toString('base64'),
            ContentLocation: 'S',
            FirstPublishLocationId: opportunityId
          };
          const uploadResult = await conn.sobject('ContentVersion').create(contentVersion);
          if (uploadResult.success) {
            console.log(`[UPLOAD ${uniqueId}] File uploaded successfully: ${safeOriginalName}`);
            filesUploaded++;
            uploadedFiles.push({ fieldName, displayName, fileName: safeOriginalName, contentVersionId: uploadResult.id });
          } else {
            console.error(`[UPLOAD ${uniqueId}] Failed:`, uploadResult.errors);
            filesFailed++;
            failedFiles.push({ fieldName, displayName, fileName: safeOriginalName, error: uploadResult.errors });
          }
        } catch (error) {
          console.error(`[UPLOAD ERROR] ${fieldName} - ${file.originalname}:`, error);
          filesFailed++;
          failedFiles.push({ fieldName, fileName: file.originalname, error: error.message });
        }
      }
    }

    // Prepare response
    const response = {
      success: true,
      message: 'Files uploaded successfully',
      filesUploaded: filesUploaded,
      filesFailed: filesFailed,
      uploadedFiles: uploadedFiles,
      failedFiles: failedFiles
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ error: 'An error occurred' });
  }
}