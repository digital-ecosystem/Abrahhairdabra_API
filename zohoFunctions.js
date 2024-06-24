import * as ZOHOCRMSDK from "@zohocrm/nodejs-sdk-6.0";
import { config } from 'dotenv';
import { getSuperchatRecord } from './superchatFunctions.js';
import axios from 'axios';
import { generateZohoOauthToken } from './generateZohoToken.js';
import OpenAI from "openai";

config();

const openai = new OpenAI();

const OPENAI_API_URL = 'https://api.openai.com/v1/';
const ZOHO_CRM_API_URL = 'https://www.zohoapis.eu/crm/v6/';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ASSISTANT = process.env.OPENAI_ASSISTANT;
const SUPERCHAT_API_KEY = process.env.SUPERCHAT_API_KEY;

const headers = {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v2'
};


export async function getThread(phone, contact_id){
    const OPENAI_API_URL = 'https://api.openai.com/v1/';
    let record = null;
    let thread_id = null;
    let ZOHO_OAUTH_TOKEN = await generateZohoOauthToken();
    try {
        const searchResponse = await axios.get(`${ZOHO_CRM_API_URL}Leads/search?phone=${phone}`, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${ZOHO_OAUTH_TOKEN}`
            }
        });
        if (searchResponse)
        {
            record = searchResponse.data.data;
            if (record && record.length > 0) {
                thread_id = record[0].Thread_Id;
                console.log('Thread ID in putMessageInThreadAssistant:', thread_id);
            }
        }
    } catch (error) {
        try {
            setTimeout(async () => {
                const searchResponse = await axios.get(`${ZOHO_CRM_API_URL}Leads/search?phone=${phone}`, {
                    headers: {
                        'Authorization': `Zoho-oauthtoken ${ZOHO_OAUTH_TOKEN}`
                    }
                });
                if (searchResponse)
                {
                    record = searchResponse.data.data;
                    if (record && record.length > 0) {
                        thread_id = record[0].Thread_Id;
                        console.log('Thread ID in putMessageInThreadAssistant:', thread_id);
                    }
                }
            }
            , 10000);
        } catch (error) {
            console.error('Error searching record in Zoho CRM in putMessageInThreadAssistant:', error);
        }
    }

    // If no thread_id, create a new thread
    if (!thread_id)
    {
        const response = await axios.post(`${OPENAI_API_URL}threads`, {}, { headers });
        thread_id = response.data.id;

        const update_record = { Thread_Id: thread_id };
        if (record && record.length > 0) {
            const id = record[0].id;
            try {
                await axios.put(`${ZOHO_CRM_API_URL}Leads/${id}`, { data: [update_record] }, {
                    headers: {
                        'Authorization': `Zoho-oauthtoken ${ZOHO_OAUTH_TOKEN}`
                    }
                });
            } catch (error) {
                try {
                    setTimeout(async () => {
                        await axios.put(`${ZOHO_CRM_API_URL}Leads/${id}`, { data: [update_record] }, {
                            headers: {
                                'Authorization': `Zoho-oauthtoken ${ZOHO_OAUTH_TOKEN}`
                            }});
                    }, 10000);
                } catch (error) {
                    console.error('Error updating record in Zoho CRM in putMessageInThreadAssistant:', error);
                }
            }
        }
        else
        {
            update_record.Phone = phone;
            update_record.First_Name = getSuperchatRecord(contact_id).first_name ?? 'unknown';
            update_record.Last_Name = getSuperchatRecord(contact_id).last_name ?? 'unknown';
            try
            {
                const res = await axios.post(`${ZOHO_CRM_API_URL}Leads`, { data: [update_record] }, {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${ZOHO_OAUTH_TOKEN}`
                }
            });
            }
            catch (error)
            {
                try {
                    const res = await axios.post(`${ZOHO_CRM_API_URL}Leads`, { data: [update_record] }, {
                        headers: {
                            'Authorization': `Zoho-oauthtoken ${ZOHO_OAUTH_TOKEN}`
                        }
                    });
                } catch (error) {
                    console.error('Error creating record in Zoho CRM in putMessageInThreadAssistant:', error);   
                }
            }
        }
    }
    return thread_id;
}