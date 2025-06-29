# Employee Table System

## Overview
This system provides an editable HTML table for managing employee data that can be submitted to Salesforce and sent to a webhook. Each row in the table represents a new contact that will be created in Salesforce under the "עובדים" (Employees) list and linked to a specific opportunity.

## Files Created

### 1. `public/employee-table.html`
The main HTML page containing:
- Editable table with all required employee fields
- Add/delete row functionality
- Form validation
- Submit button that sends data to Salesforce and webhook
- Responsive design matching the existing project style

### 2. `api/submit-employees.js`
API endpoint that:
- Receives employee data from the frontend
- Gets the related business (בית עסק) from the opportunity
- Creates Contact records in Salesforce under "עובדים" record type with minimal required fields
- Sets JobTitle__c field to "עובד" for each contact
- Links contacts to the specified opportunity via OpportunityContactRole
- Sends all data to webhook at https://hook.eu2.make.com/qgsdbc94kgk1fmlva2p1inqrmrrnraxl
- Returns success/error responses

### 3. `test-employee-submission.js`
Test file for verifying the functionality works correctly.

## Table Fields

| Column | Type | Required | Editable | Default Value | Validation |
|--------|------|----------|----------|---------------|------------|
| שם פרטי עברית | Text | Yes | Yes | - | Required |
| שם משפחה עברית | Text | Yes | Yes | - | Required |
| שם פרטי אנגלית | Text | Yes | Yes | - | Required |
| שם משפחה אנגלית | Text | Yes | Yes | - | Required |
| ת.ז | Number | Yes | Yes | - | 9 digits exactly |
| מספר נייד | Phone | Yes | Yes | - | 10 digits |
| עיר מגורים | Text | Yes | Yes | - | Required |
| חברה מגייסת | Text | Yes | Yes | - | Required |
| רצפה / מועדון | Text | No | No | מטלון 264 | Read-only |
| החלטה | Text | No | No | Empty | Read-only |
| חתימה על הצהרה | Checkbox | No | Yes | - | Optional |
| מייל | Email | Yes | Yes | - | Valid email format |

## Usage

### 1. Access the Page
Navigate to: `https://your-domain.com/employee-table.html?opportunity_id=YOUR_OPPORTUNITY_ID`

### 2. Add Employees
- Click "הוסף שורה חדשה" to add a new employee row
- Fill in all required fields
- Add as many employees as needed

### 3. Delete Employees
- Click "מחק" button on any row to remove it

### 4. Submit Data
- Click "שליחה" to submit all employee data
- The system will create Contact records under "עובדים" list and link them to the opportunity
- All data will also be sent to the webhook

## Salesforce Integration

### Contact Fields Mapping
The system maps the form data to these Salesforce Contact fields (only the required ones):

- `FirstName` - Hebrew first name (שם פרטי עברית)
- `LastName` - Hebrew last name (שם משפחה עברית)
- `Phone` - Phone number (מספר נייד)
- `Company__c` - Lookup to בית עסק (automatically retrieved from opportunity)
- `JobTitle__c` - Set to "עובד" (picklist value)
- `Email` - Email address (מייל)

### Business (בית עסק) Lookup
The system automatically retrieves the related business (בית עסק) from the opportunity using:
1. `AccountId` field (standard Salesforce field)
2. Alternative custom fields: `Business__c`, `Company__c`, `בית_עסק__c`

### Record Type
Contacts are created under the "עובדים" (Employees) record type. If this record type doesn't exist, the system will try alternative names:
- "Employees"
- "Employee" 
- "עובד"

If none are found, it will use the default Contact record type.

### Opportunity Contact Role
Each contact is automatically linked to the opportunity via an OpportunityContactRole record with:
- `OpportunityId` - The opportunity ID from the URL
- `ContactId` - The newly created contact ID
- `Role` - Set to "Employee"
- `IsPrimary` - Set to false

## Webhook Integration

### Webhook URL
All employee data is sent to: https://hook.eu2.make.com/qgsdbc94kgk1fmlva2p1inqrmrrnraxl

### Webhook Data Structure
```json
{
  "opportunityId": "006XXXXXXXXXXXXXXX",
  "companyId": "001XXXXXXXXXXXXXXX",
  "employees": [
    {
      "firstNameHebrew": "יוסי",
      "lastNameHebrew": "כהן",
      "firstNameEnglish": "Yossi",
      "lastNameEnglish": "Cohen",
      "idNumber": "123456789",
      "phoneNumber": "0501234567",
      "city": "תל אביב",
      "recruitingCompany": "חברה מגייסת א",
      "floorClub": "מטלון 264",
      "decision": "",
      "declaration": true,
      "email": "yossi.cohen@example.com"
    }
  ],
  "submissionDate": "2024-01-01T12:00:00.000Z"
}
```

### Webhook Behavior
- Webhook calls are made asynchronously
- If webhook fails, the Salesforce integration still proceeds
- Webhook failures are logged but don't affect the main functionality

## Validation Rules

1. **Required Fields**: All fields marked as required must be filled
2. **ID Number**: Must be exactly 9 digits (no commas, dots, or other characters)
3. **Phone Number**: Must be exactly 10 digits
4. **Email**: Must be a valid email format
5. **At Least One Employee**: The table must contain at least one employee row
6. **Business Lookup**: The opportunity must have a related business (בית עסק)

## Error Handling

The system provides clear error messages for:
- Missing opportunity ID in URL
- Missing related business (בית עסק) for the opportunity
- Validation errors
- Salesforce connection issues
- Data submission failures
- Webhook communication issues (logged but not blocking)

## Styling

The page uses the same styling as the existing project:
- Brand colors: Purple (#6531a3) and Cyan (#00bcd4)
- Rubik font family
- Responsive design
- RTL (Right-to-Left) layout for Hebrew

## Testing

Use the test file to verify functionality:
```javascript
node test-employee-submission.js
```

## Environment Variables

Make sure these Salesforce environment variables are set:
- `SALESFORCE_USERNAME`
- `SALESFORCE_PASSWORD`
- `SALESFORCE_SECURITY_TOKEN`
- `SALESFORCE_LOGIN_URL` (optional, defaults to production)

## Customization

### Contact Record Type
The system looks for a "עובדים" record type for contacts. If this doesn't exist in your Salesforce org, it will try alternative names or use the default record type.

### Job Title Field
The `JobTitle__c` field is automatically set to "עובד" for all new employee contacts.

### Business Lookup Field
If your opportunity uses a different field name for the business lookup, update the `getCompanyFromOpportunity` function in the API.

### Contact Role
The default role in OpportunityContactRole is "Employee". You can modify this in the API file if needed.

### Webhook URL
To change the webhook URL, update the URL in the `submit-employees.js` file. 