import axios from 'axios';
import dotenv from 'dotenv';


dotenv.config();

const ZOHO_TOKEN_URL = 'https://accounts.zoho.eu/oauth/v2/token';
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN_FOR_BOOKING = process.env.REFRESH_TOKEN_FOR_BOOKING; // Store this refresh token securely

let ZOHO_OAUTH_TOKEN = null;

export async function generateZohoOauthTokenForBooking() {
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
        ZOHO_OAUTH_TOKEN = access_token;
        setTimeout(() => {
            ZOHO_OAUTH_TOKEN = null;
          }, expires_in * 1000);          
    } catch (error) {
        console.error('Error generating Zoho OAuth token:', error.response.data);
    }
}

export async function book_appointment(data, phone) {
    if (!ZOHO_OAUTH_TOKEN) {
        await generateZohoOauthTokenForBooking();
    }
    const args = JSON.parse(data);
    if (!args || args.date || args.full_name || args.email) {
        return 'either date or full name or email is missing';	
    } else if (!ZOHO_OAUTH_TOKEN) {
        console.error('Error generating Zoho OAuth token in booking function');
        return "something went wrong, please try again in 5 minutes";
    }
    const { date, full_name, email, service_id } = args;
    const staff_id = process.env.STAFF_ID;
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
        const bookingResponse = book_appointment.data.response;
        if (bookingResponse.status === 'success') {
            bookingResponse = 'appointment booked successfully';
        }
        else
        {
            bookingResponse = 'appointment not booked';
        }
    } catch (error) {
        console.error('Error booking appointment in Zoho CRM:', error);
        return 'an error occurred while booking the appointment';
    }

}


//book_appointment(null, 'bassem@gmail.com', 'bassem mahdi', null, null, null);

export async function search_for_available_slots(data) {
    const args = JSON.parse(data);
    if (!ZOHO_OAUTH_TOKEN) {
        await generateZohoOauthTokenForBooking();
    }
    if (!ZOHO_OAUTH_TOKEN) {
        console.error('Error generating Zoho OAuth token in search function');
        return "something went wrong, please try again in 5 minutes";
    } else if (!args || !args.date || !args.service_id) {
        return 'either date or service id is missing';
    }
    let availableSlots = null;
    const staff_id = process.env.STAFF_ID;
    const date = args.date;
    const service_id = args.service_id;
    try {
        const searchResponse = await axios.get(`https://www.zohoapis.eu/bookings/v1/json/availableslots?service_id=${service_id}&staff_id=${staff_id}&selected_date=${date}`, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${ZOHO_OAUTH_TOKEN}`
            }
        });
        availableSlots = searchResponse.data.response.returnvalue.data;
        if ((availableSlots && availableSlots === 'Slots Not Available') || !availableSlots ||!availableSlots[0]) {
            return 'no slots available';
        } else{
            if (!Array.isArray(availableSlots)) {
                availableSlots = [availableSlots];
            }
            return availableSlots.join(', ');
        }
    } catch (error) {
        console.error('Error searching record in Zoho bookings:', error.response.data);
        return 'an error occurred while searching for available slots';
    }
}


