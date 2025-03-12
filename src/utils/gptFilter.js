import { getSuperchatRecord, getSuperchatConveration} from '../api/superchat.js';
import { config } from 'dotenv';
import { generateAIResponse } from './fetch.js';
import { getThread } from './superchat.js';
import { openai, blockingLebels, gpt_lebel } from '../config/index.js';



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
        await generateAIResponse(mg, phone, contact_id, 0);
        return false;
    }
    else
    {
        return true;
    }
}


export async function outboundMessageFilter(contact_id, phone, content) {
    const thread_id = await getThread(contact_id);
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