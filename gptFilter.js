import { getSuperchatRecord, getSuperchatConveration} from './superchatFunctions.js';
import { config } from 'dotenv';
import { call_in_OpenAi } from './fetch.js';

config();


const blockingLebels = [
    process.env.BLOCK_AI_LEBEL,
    process.env.VIP_KUNDE_LEBEL,
    process.env.BESTANDSKUNDE_LEBEL,
];
const gbt_attribute_id =    process.env.GPT_ATTRIBUTE;
const gpt_lebel =           process.env.GPT_LEBEL;


export async function runGpt(contact_id, mg, phone) {
    const contact_record = await getSuperchatRecord(contact_id);
    const conversation_record = await getSuperchatConveration(contact_id);
    const lebels = conversation_record.results[0].labels;
    const custom_attributes = contact_record.custom_attributes;
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
                    checker = 0;
                }
            });
        }
    });

    if (checker === 0)
    {

        call_in_OpenAi(mg, phone, contact_id, 0);
        return false;
    }
    else
    {
        return true;
    }
}