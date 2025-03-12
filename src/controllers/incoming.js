import { userInfo, isDev } from '../config/index.js';
import {generateAIResponse, putMessageInThreadAssistant} from '../utils/fetch.js';
import { runGpt } from '../utils/gptFilter.js';



export const ProcessData = async (req, res) => {
	const response = req.body;
	const userId = response.message.from.id;
	const message = response.message.content.body;
	const userPhone = response.message.from.identifier;
	const superchat_contact_id = response.message.from.id;

	if ((!userPhone === "+4368181520584" && isDev) || (userPhone === "+4368181520584" && !isDev)) {
		return res.status(200).send('Outbound message received');
	}
	console.log(`Incoming message received from user ${userId}:`, message);
	// delete this before push 
	if (!userInfo[userId]) {
		userInfo[userId] = {
			messages: [],
			quickReplayBody: null,
			timeout: null,
			processing: false,
			outboundReceived: false,
			messageType: null,
			template_id: null
		};
	}

	// Push the new message to the user's message list
	userInfo[userId].messages.push(message);
	userInfo[userId].phone = userPhone;
	userInfo[userId].superchat_contact_id = superchat_contact_id;

	// If the user is already in processing, return
	if (userInfo[userId].processing) {
		console.log(`User ${userId} is already in processing`);
		return res.status(200).send('Message received');
	}

	// Clear any existing timeout
	if (userInfo[userId].timeout) {
		clearTimeout(userInfo[userId].timeout);
	}

	res.status(200).send('Message received');
	// Set a new timeout for 10 seconds
	userInfo[userId].timeout = setTimeout(async () => {
		if (userInfo[userId] && userInfo[userId].messages && userInfo[userId].messages.length > 0) {
			runGpt(superchat_contact_id, await userInfo[userId].messages.join('\n'), userPhone).then(async (Istrue) => {
				if (Istrue === true) {
					console.log("User is in processing");
					await processUserMessages(userId);
					delete userInfo[userId];
				}
				else {
					console.log("User is blocked");
					if (userInfo[userId].outboundReceived && (userInfo[userId].template_id || userInfo[userId].quickReplayBody)) {
						const template_id = userInfo[userId].template_id;
						const quickReplayBody = userInfo[userId].quickReplayBody;
						await putMessageInThreadAssistant(template_id, quickReplayBody, userPhone, superchat_contact_id);
						delete userInfo[userId];
						console.log(`Outbound message  received for user ${userId}`);
					}
					else {
						console.log(`Outbound message not received for user ${userId}`);
					}
				}
			}).catch(error => {
				console.error("Error fetching or processing contact record:", error);
			});
		}
	}, 10000);
};


async function processUserMessages(userId) {
    const userData = userInfo[userId];
    if (userData && userData.messages && userData.messages.length > 0) {
        console.log(`Processing messages for user ${userId}:`, userData.messages);
        let convertMassage = userData.messages.join('\n');
		userInfo[userId].messages = [];
        if (convertMassage)
        {
			try {
				userInfo[userId].processing	= true;
				await generateAIResponse(convertMassage, userData.phone, userData.superchat_contact_id, 1);
			} catch (error) {
				console.log("Error generating AI response:", error);
			} finally {
				userInfo[userId].processing	= false;
				if (userInfo[userId].messages && userInfo[userId].messages.length > 0) {
					await processUserMessages(userId);
				}
			}
        }
    }
}