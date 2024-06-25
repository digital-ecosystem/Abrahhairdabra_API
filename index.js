import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bodyParser from 'body-parser';
import { config } from 'dotenv';
import {call_in_OpenAi, putMessageInThreadAssistant} from './fetch.js';
import {runGpt, outboundMessageFilter} from './gptFilter.js';
import { Templates } from '@zohocrm/nodejs-sdk-6.0';
import {runThreadAndSend} from './sendMessagefromAttribute.js';

config();





const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const NGROK_AUTHTOKEN = process.env.NGROK_TOKEN;

app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.send('Hello World!');
});

let userInfo = {}; // To store user messages and timeouts


let tt = null;



app.post('/webhook', (req, res) => {
    const  response  = req.body;

    const userId = response.message.from.id;
    const message = response.message.content.body;
    const userPhone = response.message.from.identifier;
    const superchat_contact_id = response.message.from.id;

    tt = userPhone;

    if (!userInfo[userId]) {
        userInfo[userId] = {
            messages: [],
            quickReplayBody: null,
            timeout: null,
            outbound: null,
            outboundReceived: false,
            messageType: null,
            template_id: null
        };
    }

    // Push the new message to the user's message list
    userInfo[userId].messages.push(message);
    userInfo[userId].phone = userPhone;
    userInfo[userId].superchat_contact_id = superchat_contact_id;

    // Clear any existing timeout
    if (userInfo[userId].timeout || userInfo[userId].outbound)
    {
        clearTimeout(userInfo[userId].timeout);
        clearTimeout(userInfo[userId].outbound);
    }

    // Set a new timeout for 20 seconds
    userInfo[userId].timeout = setTimeout( async() =>
    {
        runGpt(superchat_contact_id, await userInfo[userId].messages.join('\n'), userPhone).then(Istrue =>
        {
            if (Istrue === true)
            {
                console.log("User is in processing");
                processUserMessages(userId);
            }
            else
            {
                console.log("User is blocked");
                userInfo[userId].outbound = setTimeout(() =>
                {
                    if (userInfo[userId].outboundReceived && (userInfo[userId].template_id || userInfo[userId].quickReplayBody))
                    {
                        const template_id = userInfo[userId].template_id;
                        const quickReplayBody = userInfo[userId].quickReplayBody;
                        putMessageInThreadAssistant(template_id, quickReplayBody, userPhone);
                        console.log("template id", userInfo[userId].template_id);
                        console.log(`Outbound message  received for user ${userId}`);
                    }
                    else
                    {
                        console.log(`Outbound message not received for user ${userId}`);
                    }
                    delete userInfo[userId];
                }, 10000);
            }
            
        }).catch(error => {
            console.error("Error fetching or processing contact record:", error);
        });
    }, 20000);


    res.status(200).send('Message received');
});






app.post('/outboundWebhook', async (req, res) => {
    const outboundMessageInfo = req.body;
    const userId = outboundMessageInfo.message.to[0].contact_id;
    const contentType = outboundMessageInfo.message.content.type;
    const phoneNummber = parseInt(outboundMessageInfo.message.to[0].identifier);

    if (userInfo[userId])
    {
        if (contentType === 'whats_app_template')
        {
            userInfo[userId].template_id = outboundMessageInfo.message.content.template_id;
            userInfo[userId].outboundReceived = true;
            userInfo[userId].messageType = contentType;
        }
        else if (contentType === 'whats_app_quick_reply')
        {
            userInfo[userId].quickReplayBody = outboundMessageInfo.message.content.body;
            userInfo[userId].outboundReceived = true;
            userInfo[userId].messageType = contentType;
        }
    }else if (await outboundMessageFilter(userId, phoneNummber, outboundMessageInfo.message.content.body))
    {
        if (contentType === 'whats_app_template')
        {
            const template_id = outboundMessageInfo.message.content.template_id;
            await putMessageInThreadAssistant(template_id, null, phoneNummber);
        }
        else if (contentType === 'whats_app_quick_reply')
        {
            const quickReplayBody = outboundMessageInfo.message.content.body;
            await putMessageInThreadAssistant(null, quickReplayBody, phoneNummber);
        }
        else
        {
            const content = outboundMessageInfo.message.content.body;
            await putMessageInThreadAssistant(null, content, phoneNummber);
            
        }
    }
    res.status(200).send('Outbound message received');
});

async function processUserMessages(userId) {
    const userData = userInfo[userId];
    if (userData && userData.messages.length > 0) {
        console.log(`Processing messages for user ${userId}:`, userData.messages);

        let convertMassage = userData.messages.join('\n');
        await call_in_OpenAi(convertMassage, userData.phone, userData.superchat_contact_id, 1);
        delete userInfo[userId];
    }
}


app.post('/runchatgpt', (req, res) => {
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
});

app.listen(PORT, () => {
  console.log('Server is running on http://localhost: ' + PORT);
});
