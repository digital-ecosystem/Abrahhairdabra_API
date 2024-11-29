import axios from 'axios';
import dotenv from 'dotenv';
import { generateZohoOauthToken } from './generateZohoToken.js';
import OpenAI from "openai";
import { getSuperchatRecord, sendMessage, getContentTemplateFromSuperchat } from './src/api/superchat.js';
import { search_for_available_slots, book_appointment } from './booking.js';
import { getThread, UpdateThread } from './src/utils/superchat.js';

dotenv.config();



const OPENAI_API_URL = 'https://api.openai.com/v1/';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ASSISTANT = process.env.OPENAI_ASSISTANT;

const headers = {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v2'
};

const openai = new OpenAI({apiKey: OPENAI_API_KEY});


export async function call_in_OpenAi(mg, phone, superchat_contact_id, checker) {


    let thread_id = null;

    // search for the thread in superchat
    try {
        const getTHread = await getThread(superchat_contact_id);
        console.log('Thread ID:', getTHread);
        if (getTHread)
        {
            thread_id = getTHread;
        }
    } catch (error) {
        console.error('Error searching for the thread in superchat', error);
    }
    // If no thread_id, create a new thread an update the thread in superchat
    if (!thread_id) {
        const response = await axios.post(`${OPENAI_API_URL}threads`, {}, { headers });
        thread_id = response.data.id;
        await UpdateThread(superchat_contact_id, thread_id);
    }

    // Update the thread with the new message
    let messageContent = null;
    if (mg)
    {
        try {
            const response1 = await openai.beta.threads.messages.create(
                thread_id,
                { role: "user", content: mg }
            );
            const message_id = response1.id;

            if (checker === 1)
            {
                let run = await openai.beta.threads.runs.createAndPoll(thread_id, { assistant_id: OPENAI_ASSISTANT });
                while (run.status !== 'completed') {
                    if (run.status === 'requires_action') {
                        if (run.required_action && run.required_action.submit_tool_outputs && run.required_action.submit_tool_outputs.tool_calls) {
                            console.log("Tool calls found.", run.required_action.submit_tool_outputs);
                            const toolOutputs = await Promise.all(run.required_action.submit_tool_outputs.tool_calls.map(async (tool) => {
                                console.log("Tool calls found.", run.required_action.submit_tool_outputs.tool_calls[0].function.name);
                                if (tool.function.name === 'your_current_date_and_time'){
                                    var event = new Date();
                                    console.log("the date of today is: ", event);
                                    const dateString = event.toString();
                                    return {
                                        tool_call_id: tool.id,
                                        output: dateString,
                                    };
                                } else if (tool.function.name === "search_for_available_slots") {
                                    const args = JSON.parse(tool.function.arguments);
                                    let availableSlots = null;
                                    if (args && args.date) {
                                        const date = args.date;
                                        const service_id = args.service_id;
                                        console.log(date);
                                        availableSlots = await search_for_available_slots(date, service_id);
                                        if ((availableSlots && availableSlots === 'Slots Not Available') || !availableSlots ||!availableSlots[0]) {
                                            availableSlots = 'no slots available';
                                        }else
                                        {
                                            if (!Array.isArray(availableSlots)) {
                                                availableSlots = [availableSlots];
                                            }
                                            availableSlots = availableSlots.join(', ');
                                        }
                                        console.log(availableSlots);
            
                                    } else {
                                        availableSlots = 'no slots available';
                                    }
                                    return {
                                        tool_call_id: tool.id,
                                        output: availableSlots,
                                    };
                                }else if (tool.function.name === "book_appointment"){
                                    const args = JSON.parse(tool.function.arguments);
                                    let bookingResponse = null;
                                    if (args && args.date && args.full_name && args.email) {
                                        const date = args.date;
                                        const full_name = args.full_name;
                                        const email = args.email;
                                        const service_id = args.service_id;
                                        bookingResponse = await book_appointment(date, email, full_name, phone, null, service_id);
                                        if (bookingResponse.status === 'success') {
                                            bookingResponse = 'appointment booked successfully';
                                        }
                                        else
                                        {
                                            bookingResponse = 'appointment not booked';
                                        }
                                        console.log(bookingResponse);
                                    } else {
                                        bookingResponse = 'no slots available';
                                    }
                                    return {
                                        tool_call_id: tool.id,
                                        output: bookingResponse,
                                    };
                                }
                            }));
                            if (toolOutputs.length > 0) {
                                run = await openai.beta.threads.runs.submitToolOutputsAndPoll(thread_id, run.id, { tool_outputs: toolOutputs });
                                console.log("Tool outputs submitted successfully.");
                            } else {
                                console.log("No tool outputs to submit.");
                            }
                        }
                        run = await openai.beta.threads.runs.retrieve(thread_id, run.id);
                    }
                }
                // to get the last message from the assistant
                const threadMessages = await openai.beta.threads.messages.list(thread_id);
                const letMessage = threadMessages.data;
                messageContent = letMessage[0].content[0].text.value;
                sendMessage(messageContent, superchat_contact_id);
                console.log("message was sent to", phone);
            }
        } catch (error) {
            console.error('Error updating thread or retrieving messages:', error);
        }
    }
    return thread_id;
}


export async function putMessageInThreadAssistant(template_id, quickReplayBody, phone, superchat_contact_id)
{
    let thread_id = null;
    try {
        const getTHread = await getThread(superchat_contact_id);
        if (getTHread)
        {
            thread_id = getTHread;
        }
    } catch (error) {
        console.error('Error searching for the thread in superchat', error);
    }

    // If no thread_id, create a new thread
    if (!thread_id)
    {
        const response = await axios.post(`${OPENAI_API_URL}threads`, {}, { headers });
        thread_id = response.data.id;
        UpdateThread(superchat_contact_id, thread_id);
    }
    if (template_id || quickReplayBody)
    {
        let content_message = quickReplayBody;
        if (template_id)
        {
            const template_response = await getContentTemplateFromSuperchat(template_id);
            content_message = template_response.content.body;
        }
        try {
            const response1 = await openai.beta.threads.messages.create(
                thread_id,
                { role: "assistant", content: content_message }
            );
            console.log('Message was pushed to the thread: ', thread_id);
        } catch (error) {
            console.error('Error sending template message:', error);
        }
    }
}

