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


        // Store the access token and its expiration time securely
        // Example: Save to environment variables or secure storage
        process.env.ZOHO_OAUTH_TOKEN = access_token;

        return access_token;
    } catch (error) {
        try {
            return setTimeout(generateZohoOauthToken, 3000);
        } catch (error) {
            console.error('Error generating Zoho OAuth token:', error.response ? error.response.data : error.message);
        }
        console.error('Error generating Zoho OAuth token:', error.response ? error.response.data : error.message);
        throw error;
    }
}

