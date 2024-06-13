import * as ZOHOCRMSDK from "@zohocrm/nodejs-sdk-6.0";
import { config } from 'dotenv';
import { getSuperchatRecord } from './superchatFunctions.js';

config();

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_url = process.env.REDIRECT_URI;
const refresh_token = process.env.REFRESH_TOKEN;

// Initialize Zoho CRM SDK
export async function initializeZohoCRM() {
    const environment = ZOHOCRMSDK.EUDataCenter.PRODUCTION();
    const token = new ZOHOCRMSDK.OAuthBuilder()
        .clientId(client_id)
        .clientSecret(client_secret)
        .refreshToken(refresh_token)
        .redirectURL(redirect_url)
        .build();

    const builder = new ZOHOCRMSDK.InitializeBuilder();
    builder.environment(environment);
    builder.token(token);
    await builder.initialize();
}

export async function updateRecord(recordId, thread_id) {
    try {
        

        const moduleAPIName = "Leads"; // The module name where the record exists

        // Create an instance of RecordOperations Class that contains methods for record operations
        const recordOperations = new ZOHOCRMSDK.Record.RecordOperations();

        // Create an instance of Record Class and set the record fields
        const record = new ZOHOCRMSDK.Record.Record();
        record.addFieldValue(ZOHOCRMSDK.Record.Field.Leads.THREAD_ID, thread_id);
        // Add more fields as needed

        // Add the record to the list
        const records = [record];

        // Get an instance of BodyWrapper and set the list of records to be updated
        const request = new ZOHOCRMSDK.Record.BodyWrapper();
        request.setData(records);

        // Call the updateRecord method with moduleAPIName and recordId
        const response = await recordOperations.updateRecord(recordId, moduleAPIName, request);

        if (response != null) {
            // Handle the response
            console.log("Status Code: ", response.getStatusCode());
            console.log("Response: ", response.getObject());
        }
    } catch (error) {
        console.error("Error updating record:", error);
    }
}

export async function createRecord(phone, thread_id, superchat_contact_id) {
    try {
        initializeZohoCRM();

        const moduleAPIName = "Leads"; // The module name where the record exists

        // Get first and last name from superchat
        const superchatRecord = await getSuperchatRecord(superchat_contact_id);

        // Create an instance of RecordOperations Class that contains methods for record operations
        const recordOperations = new ZOHOCRMSDK.Record.RecordOperations();

        // Create an instance of Record Class and set the record fields
        const record = new ZOHOCRMSDK.Record.Record();
        record.addFieldValue(ZOHOCRMSDK.Record.Field.Leads.FIRST_NAME, superchatRecord.first_name);
        record.addFieldValue(ZOHOCRMSDK.Record.Field.Leads.LAST_NAME, superchatRecord.last_name);
        record.addFieldValue(ZOHOCRMSDK.Record.Field.Leads.Phone, phone);
        record.addFieldValue(ZOHOCRMSDK.Record.Field.Leads.THREAD_ID, thread_id);
        // Add more fields as needed

        // Add the record to the list
        const records = [record];

        // Get an instance of BodyWrapper and set the list of records to be created
        const request = new ZOHOCRMSDK.Record.BodyWrapper();
        request.setData(records);

        // Call the createRecords method with moduleAPIName
        const response = await recordOperations.createRecords(moduleAPIName, request);

        if (response != null) {
            // Handle the response
            console.log("Status Code: ", response.getStatusCode());
            console.log("Response: ", response.getObject());
        }
    } catch (error) {
        console.error("Error creating record:", error);
    }
}