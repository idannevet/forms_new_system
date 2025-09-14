# Forms System with Salesforce Integration

This project contains forms that submit data directly to Salesforce using Vercel serverless functions.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
You need to set up the following environment variables in your Vercel project:

- `SALESFORCE_USERNAME` - Your Salesforce username
- `SALESFORCE_PASSWORD` - Your Salesforce password  
- `SALESFORCE_SECURITY_TOKEN` - Your Salesforce security token
- `SALESFORCE_LOGIN_URL` - Salesforce login URL (default: https://login.salesforce.com)

### 3. Salesforce Setup
You'll need to create a custom object in Salesforce called `Custom_Form_Submission__c` with the following fields:

#### Standard Fields:
- Business_Name__c (Text)
- Marketing_Name__c (Text)
- Establishment_Date__c (Date)
- Company_Number__c (Text)
- Business_Address__c (Text)
- Business_Sector__c (Text)
- Owner_Email__c (Email)
- Owner_Phone__c (Phone)
- Owner_Count__c (Number)
- Bank_Name__c (Text)
- Branch_Number__c (Number)
- Account_Number__c (Number)
- Form_Type__c (Text)
- Submission_Date__c (DateTime)

#### Additional Fields for Eligibility Check:
- Monthly_Deals__c (Number)
- Average_Deal_Amount__c (Currency)
- Average_Sales__c (Currency)

#### Owner Fields (for multiple owners):
- Owner_1_Name__c (Text)
- Owner_1_Phone__c (Phone)
- Owner_1_ID__c (Text)
- Owner_2_Name__c (Text)
- Owner_2_Phone__c (Phone)
- Owner_2_ID__c (Text)
- (Continue for up to 5 owners)

### 4. Deploy to Vercel
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add the environment variables in Vercel dashboard
4. Deploy

## Forms
- `ERN_open.html` - E.R.N פתיחת בית עסק חדש
- `eligibility_check.html` - בדיקת זכאות | C.A.L

## API Endpoints
- `/api/submit-ern` - Handles ERN_open form submissions
- `/api/submit-eligibility` - Handles eligibility_check form submissions 