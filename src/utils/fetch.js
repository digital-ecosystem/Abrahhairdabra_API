import axios from 'axios';
import dotenv from 'dotenv';
import { getSuperchatRecord, sendMessage, getContentTemplateFromSuperchat } from '../api/superchat.js';
import { search_for_available_slots, book_appointment } from '../api/zohobookings.js';
import { getThread, UpdateThread } from './superchat.js';
import { openai, OPENAI_ASSISTANT } from '../config/index.js';




export async function generateAIResponse(mg, phone, superchat_contact_id, checker) {
    let thread_id = null;
    let run = null;
    const MAX_POLLS = 10;
    let polls = 0;
    // search for the thread in superchat
    try {
        const getTHread = await getThread(superchat_contact_id);
        console.log('Thread ID:', getTHread);
        if (getTHread) {
            thread_id = getTHread;
        }
    } catch (error) {
        console.error('Error searching for the thread in superchat', error);
    }
    // If no thread_id, create a new thread an update the thread in superchat
    if (!thread_id) {
        const response = await openai.beta.threads.create();
        thread_id = response.id;
        await UpdateThread(superchat_contact_id, thread_id);
    }

    // Update the thread with the new message
    let messageContent = null;
    if (mg) {
        try {
            const response1 = await openai.beta.threads.messages.create(thread_id, { role: "user", content: mg });
            if (checker === 1) {
                run = await openai.beta.threads.runs.createAndPoll(thread_id, { assistant_id: OPENAI_ASSISTANT });
                while (run.status !== 'completed' && polls < MAX_POLLS) {
                    if (run.status === 'requires_action') {
                        if (run.required_action && run.required_action.submit_tool_outputs && run.required_action.submit_tool_outputs.tool_calls) {
                            const toolOutputs = await Promise.all(run.required_action.submit_tool_outputs.tool_calls.map(async (tool) => {
                                console.log("Tool calls found.", run.required_action.submit_tool_outputs.tool_calls[0].function.name);
                                if (tool.function.name === 'your_current_date_and_time') {
                                    const event = new Date();
                                    const dateString = event.toString();
                                    return {tool_call_id: tool.id,output: dateString };
                                } else if (tool.function.name === "search_for_available_slots") {
                                    const availableSlots = await search_for_available_slots(tool.function.arguments);
                                    console.log("response for searching for an appointment :", availableSlots);
                                    return { tool_call_id: tool.id, output: availableSlots};
                                } else if (tool.function.name === "book_appointment") {
                                    const bookingResponse = await book_appointment(tool.function.arguments, phone);
                                    console.log("response for booking an appointment :", bookingResponse);
                                    return {tool_call_id: tool.id, output: bookingResponse };
                                }
                            }));
                            if (toolOutputs.length > 0) {
                                run = await openai.beta.threads.runs.submitToolOutputsAndPoll(thread_id, run.id, { tool_outputs: toolOutputs });
                                console.log("Tool outputs submitted successfully.");
                            } else {
                                console.log("No tool outputs to submit.");
                            }
                        }
                        await new Promise(resolve => setTimeout(resolve, 700));
                        polls++;
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
            if (run && run.id){
                try {
                    await openai.beta.threads.runs.cancel(thread_id, run.id);
                    console.log('Run was cancelled:', run.id);
                } catch (error) {
                    console.error('Error cancelling run:', error);
                }
            }
        }
    }
    return thread_id;
}


export async function putMessageInThreadAssistant(template_id, quickReplayBody, phone, superchat_contact_id) {
    let thread_id = null;
    try {
        const getTHread = await getThread(superchat_contact_id);
        if (getTHread) {
            thread_id = getTHread;
        }
    } catch (error) {
        console.error('Error searching for the thread in superchat', error);
    }

    // If no thread_id, create a new thread
    if (!thread_id) {
        const response = await openai.beta.threads.create();
        thread_id = response.id;
        UpdateThread(superchat_contact_id, thread_id);
    }
    if ((template_id || quickReplayBody) && thread_id) {
        let content_message = quickReplayBody;
        if (template_id) {
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

