import {config} from 'dotenv';
import OpenAI from "openai";
import axios from 'axios';
import { generateZohoOauthTokenForBooking } from '../api/zohobookings.js';
import { sendMessage } from '../api/superchat.js';

config();

export const runThread = async (req, res) => {
	const response = req.body;
    const contact = response.contact;
    const custom_attributes = contact.custom_attributes;
    const GPT_ATTRIBUTE = process.env.GPT_ATTRIBUTE;


    custom_attributes.forEach(attribute => {
        if (attribute.id === GPT_ATTRIBUTE && attribute.value === '1') 
        {
            runThreadAndSend(contact);
        }
    });

    res.status(200).send('Message received');
};

export async function runThreadAndSend(contact)
{
    const ZOHO_CRM_API_URL = 'https://www.zohoapis.eu/crm/v6/';
    let record = null;
    let thread_id = null;
    let ZOHO_OAUTH_TOKEN = await generateZohoOauthTokenForBooking();
    const openai = new OpenAI();
    const OPENAI_ASSISTANT = process.env.OPENAI_ASSISTANT;
    let phone = null;
    let messageContent = null;

    contact.handles.forEach(handle => {
        if (handle.type === 'phone') {
            phone = handle.value;
            phone = phone.toString();
        }
    });

    try {
        const searchResponse = await axios.get(`${ZOHO_CRM_API_URL}Leads/search?phone=${phone}`, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${ZOHO_OAUTH_TOKEN}`
            }
        });
        if (searchResponse)
        {
            record = searchResponse.data.data;
            if (record && record.length > 0)
            {
                thread_id = record[0].Thread_Id;
            }


            if (!thread_id)
            {
                console.log('No contact has no thread');
            }
            else
            {
                const run = await openai.beta.threads.runs.create(
                    thread_id,
                    { assistant_id: OPENAI_ASSISTANT }
                    );
                var run_status = run.status;
                while (run_status !== 'completed')
                {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    run_status = (await openai.beta.threads.runs.retrieve(thread_id, run.id)).status;
                }
                const threadMessages = await openai.beta.threads.messages.list(thread_id);
                const letMessage = threadMessages.data;
                messageContent = letMessage[0].content[0].text.value;
                sendMessage(messageContent, contact.id);
            }
        }
        else
        {
            console.log('No Lead found');
        }

    } catch (error) {
        console.error('Error searching record in Zoho CRM in putMessageInThreadAssistant run thread:', error.response.data);
    }

}