import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();

export let userInfo = {};
export const OPENAI_API_URL = 'https://api.openai.com/v1/';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const OPENAI_ASSISTANT = process.env.OPENAI_ASSISTANT;

export const headers = {
	'Authorization': `Bearer ${OPENAI_API_KEY}`,
	'Content-Type': 'application/json',
	'OpenAI-Beta': 'assistants=v2'
};

export const openai = new OpenAI({apiKey: OPENAI_API_KEY});



export const blockingLebels = [
    process.env.BLOCK_AI_LEBEL,
    process.env.VIP_KUNDE_LEBEL,
    process.env.BESTANDSKUNDE_LEBEL,
    process.env.GESPIRRT_LEBEL,
];

export const gpt_lebel =  process.env.GPT_LEBEL;

export const SUPERCHAT_API_KEY = process.env.SUPERCHAT_API_KEY;
export const SUPERCHATCHANNEL_ID = process.env.SUPERCHATCHANNEL_ID;


export const isDev = process.env.NODE_ENV === 'development';
