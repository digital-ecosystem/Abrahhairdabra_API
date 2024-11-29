import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ZOHO_TOKEN_URL = 'https://accounts.zoho.eu/oauth/v2/token';
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN; // Store this refresh token securely

export async function generateZohoOauthToken() {
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
        return access_token;
    } catch (error) {
        console.error('Error generating Zoho OAuth token:',error.response.data);
        if (error.response.data.status === 'failure')
        {
                console.log('Waiting for Zoho OAuth token in the next try in the booking...');
                const response2 = await new Promise((resolve) =>{
                    setTimeout(async () => {
                        resolve(await generateZohoOauthToken());
                    }, 10000);
                });
                return response2;
        }
        return null;
    }
}