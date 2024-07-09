import axios from 'axios';
import dotenv from 'dotenv';
import OpenAI from "openai";
import { getSuperchatRecord, sendMessage } from './superchatFunctions.js';

dotenv.config();

const ZOHO_TOKEN_URL = 'https://accounts.zoho.eu/oauth/v2/token';
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = '1000.5ea21b0e40c824be9faf9f8bb7b52fbb.a1add4292dc3463b47c9a5117bc9dece'; // Store this refresh token securely

async function generateZohoOauthTokenForBooking() {
    try {
        const response = await axios.post(ZOHO_TOKEN_URL, null, {
            params: {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                refresh_token: REFRESH_TOKEN,
                grant_type: 'refresh_token'
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, expires_in } = response.data;
        process.env.ZOHO_OAUTH_TOKEN = access_token;

        return access_token;
    } catch (error) {
        console.error('Error generating Zoho OAuth token:', error.response ? error.response.data : error.message);
        throw error;
    }
}

export async function book_appointment(date, email, full_name, phone, staff_id, service_id) {
    const ZOHO_OAUTH_TOKEN = await generateZohoOauthTokenForBooking();
    staff_id = '165640000000060232';

    try {
        const url = `https://www.zohoapis.eu/bookings/v1/json/appointment`;
        const formDate = new FormData();
        formDate.append('service_id', service_id);
        formDate.append('staff_id', staff_id);
        formDate.append('from_time', date);
        formDate.append('timezone', 'Europe/Vienna');
        formDate.append('customer_details', JSON.stringify({
            name: full_name,
            email: email,
            phone_number: phone
        }));
        const book_appointment = await axios.post(url, formDate, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${ZOHO_OAUTH_TOKEN}`
            }
        });
        return book_appointment.data.response;
    } catch (error) {
        console.error('Error booking appointment in Zoho CRM:', error);
    }

}


//book_appointment(null, 'bassem@gmail.com', 'bassem mahdi', null, null, null);

export async function search_for_available_slots(date, service_id) {
    const ZOHO_OAUTH_TOKEN = await generateZohoOauthTokenForBooking();
    const staff_id = '165640000000060232';

    try {
        const searchResponse = await axios.get(`https://www.zohoapis.eu/bookings/v1/json/availableslots?service_id=${service_id}&staff_id=${staff_id}&selected_date=${date}`, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${ZOHO_OAUTH_TOKEN}`
            }
        });
        return searchResponse.data.response.returnvalue.data;
    } catch (error) {
        console.error('Error searching record in Zoho CRM:', error);
        throw error;
    }
}


/*export async function test2() {
    const thread_id = 'thread_jatvh9E73o82OA66doj9KVhp';
    try {
        const response1 = await openai.beta.threads.messages.create(thread_id, {
            role: "user",
            content: 'ja gerne einen Termin buchen'
        });
        let run = await openai.beta.threads.runs.createAndPoll(thread_id, { assistant_id: OPENAI_ASSISTANT });
        while (run.status !== 'completed') {
            if (run.status === 'requires_action') {
                if (run.required_action && run.required_action.submit_tool_outputs && run.required_action.submit_tool_outputs.tool_calls) {
                    console.log("Tool calls found.", run.required_action.submit_tool_outputs);
                    const toolOutputs = await Promise.all(run.required_action.submit_tool_outputs.tool_calls.map(async (tool) => {
    
                        if (tool.function.name === "search_for_available_slots") {
                            const args = JSON.parse(tool.function.arguments);
                            let availableSlots = null;
                            if (args && args.date) {
                                const date = args.date;
                                console.log(date);
                                availableSlots = await search_for_available_slots(date);
                                if (availableSlots && availableSlots === 'Slots Not Available') {
                                    availableSlots = 'no slots available';
                                }else
                                {
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
                            console.log(args);
                            let bookingResponse = null;
                            if (args && args.date && args.full_name && args.email) {
                                const date = args.date;
                                const full_name = args.full_name;
                                const email = args.email;
                                bookingResponse = await book_appointment(date, email, full_name, '+4368181520584', null, null);
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
                        else if (tool.function.name === 'your_current_date_and_time')
                            var event = new Date();
                            const dateString = event.toString();
                            console.log(dateString);
                            return {
                                tool_call_id: tool.id,
                                output: dateString,
                            };
                    }));
                    if (toolOutputs.length > 0) {
                        run = await openai.beta.threads.runs.submitToolOutputsAndPoll(thread_id, run.id, { tool_outputs: toolOutputs });
                        console.log("Tool outputs submitted successfully.");
                    } else {
                        console.log("No tool outputs to submit.");
                    }
                }
            }
            run = await openai.beta.threads.runs.retrieve(thread_id, run.id);
        }
        //console.log(run);
        const response = await openai.beta.threads.messages.list(thread_id);
        const data = response.data;
        const threadMessages = data[0];
        console.log(threadMessages);
    } catch (error) {
        console.error('Error in test2 function:', error.message);
    }
}*/
//search_for_available_slots('02-07-2024');
