import { getSuperchatRecord, getSuperchatConveration} from './superchatFunctions.js';
import { config } from 'dotenv';
import { call_in_OpenAi } from './fetch.js';
import { putMessageInThreadAssistant } from './fetch.js'
import { getThread} from './zohoFunctions.js';
import OpenAI from "openai";

config();


const blockingLebels = [
    process.env.BLOCK_AI_LEBEL,
    process.env.VIP_KUNDE_LEBEL,
    process.env.BESTANDSKUNDE_LEBEL,
];
const gpt_lebel =           process.env.GPT_LEBEL;

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

export async function runGpt(contact_id, mg , phone) {
    const conversation_record = await getSuperchatConveration(contact_id);
    const lebels = conversation_record.results[0].labels;
    let checker = 0;

    
    lebels.forEach (lebel =>
    {
        if (lebel.id === gpt_lebel)
        {
            checker = 1;
            lebels.forEach(lebel_1 =>
            {
                if (blockingLebels.includes(lebel_1.id))
                {
                    console.log("user is going to be blocked brcause of lebel: ", lebel_1);
                    checker = 0;
                }
            });
        }
    });

    if (checker === 0)
    {
        await call_in_OpenAi(mg, phone, contact_id, 0);
        return false;
    }
    else
    {
        return true;
    }
}


export async function outboundMessageFilter(contact_id, phone, content) {
    const thread_id = await getThread(phone, contact_id);
    if (!thread_id)
    {
        return true;
    }
    const threadMessages = await openai.beta.threads.messages.list(thread_id);
    const listMessage = threadMessages.data;
    if (!listMessage[0].content[0])
    {
        return true;
    }
    const messageContent = listMessage[0].content[0].text.value;
    if (messageContent.includes(content))
    {
        return false;
    }
    else
    {
        return true;
    }
}