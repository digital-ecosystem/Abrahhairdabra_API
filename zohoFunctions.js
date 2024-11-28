import * as ZOHOCRMSDK from "@zohocrm/nodejs-sdk-6.0";
import { config } from "dotenv";
import { getSuperchatRecord } from "./superchatFunctions.js";
import axios from "axios";
import { generateZohoOauthToken } from "./generateZohoToken.js";
import OpenAI from "openai";

config();

const openai = new OpenAI();

const OPENAI_API_URL = "https://api.openai.com/v1/";
const ZOHO_CRM_API_URL = "https://www.zohoapis.eu/crm/v6/";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ASSISTANT = process.env.OPENAI_ASSISTANT;
const SUPERCHAT_API_KEY = process.env.SUPERCHAT_API_KEY;

const headers = {
  Authorization: `Bearer ${OPENAI_API_KEY}`,
  "Content-Type": "application/json",
  "OpenAI-Beta": "assistants=v2",
};

export async function getThread(phone, contact_id) {
  let record = null;
  let thread_id = null;
  let ZOHO_OAUTH_TOKEN = await generateZohoOauthToken();
  try {
    const searchResponse = await axios.get(
      `${ZOHO_CRM_API_URL}Leads/search?phone=${phone}`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${ZOHO_OAUTH_TOKEN}`,
        },
      }
    );
    if (searchResponse) {
      record = searchResponse.data.data;
      if (record && record.length > 0) {
        thread_id = record[0].Thread_Id;
        return thread_id;
      } else {
        return null;
      }
    } else {
      return null;
    }
  } catch (error) {
    console.error(
      "Error searching for record in Zoho CRM in getThread:",
      error.response.data
    );
  }
  return thread_id;
}
