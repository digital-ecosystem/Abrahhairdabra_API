import axios from 'axios';
import dotenv from 'dotenv';
import OpenAI from "openai";
import { getSuperchatRecord, sendMessage } from './superchatFunctions.js';

dotenv.config();

const ZOHO_TOKEN_URL = 'https://accounts.zoho.eu/oauth/v2/token';
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN_FOR_BOOKING = process.env.REFRESH_TOKEN_FOR_BOOKING; // Store this refresh token securely

async function generateZohoOauthTokenForBooking() {
    try {
        const response = await axios.post(ZOHO_TOKEN_URL, null, {
            params: {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                refresh_token: REFRESH_TOKEN_FOR_BOOKING,
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
    staff_id = process.env.STAFF_ID;

    try {
        const url = `https://www.zohoapis.eu/bookings/v1/json/appointment`;
        const formDate = new FormData();
        formDate.append('service_id', service_id);
        formDate.append('staff_id', staff_id);
        formDate.append('from_time', date);
        formDate.append('timezone', 'Europe/Vienna');
        formDate.append('additional_fields', JSON.stringify({
            source: 'GPT'
        }));
        formDate.append('customer_details', JSON.stringify({
            name: full_name,
            email: email,
            phone_number: phone,
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
    const staff_id = process.env.STAFF_ID;


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