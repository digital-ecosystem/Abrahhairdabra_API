import { listConversations, changeConversationInbox } from "../api/superchat.js"
import { getThread } from "../utils/superchat.js"
import fs from "fs"
import { openai } from "../config/index.js";

export async function analyzeConversarions() {
	let response = null;
	let next_cursor = null;
	let loop = true;
	const filePath = './src/utils/conversations.json';
	const analyzeConversarionsJson = [];
	console.log("start");
	while (loop) {
		try {
			response = await listConversations(next_cursor);
			console.log(response)
			next_cursor = response.pagination.next_cursor;
			const conversations = response.results;
			for (let index = 0; index < conversations.length; index++) {
				const conversation = conversations[index];
				const { id, channel, status, contacts, labels, inbox } = conversation;
				if (!id || !channel || !status || !contacts || !inbox) {
					console.log("conversation odesnt have all the needed fields");
					continue;
				}
				if (channel.type !== "whats_app") continue;
				if (inbox.id !== "ib_qRRXT8od3oBKGov2p31N6") continue;
				analyzeConversarionsJson.push(conversation);
				console.log("pushing");
			}
			if (!next_cursor) {
				loop = false;
			}
		} catch (error) {
			console.log(error);
		}
	}
	fs.writeFileSync(filePath, JSON.stringify(analyzeConversarionsJson, null, 2));
	console.lo
}


// async function analyze() {
// 	const conversations = JSON.parse(fs.readFileSync('./src/utils/ana-coversations.json', 'utf-8'));
// 	const filePath = './src/utils/conversations-with-threads.json';
// 	const conversionsWithThread = [];
// 	try {
// 		console.log("conversations", conversations);
// 		for (let index = 0; index < conversations.length; index++) {
// 			const conversation = conversations[index];
// 			const thread = await getThread(conversation.contacts[0].id);
// 			conversation.thread_id = thread;
// 			conversionsWithThread.push(conversation);
// 			console.log("pushing", conversation.contacts[0].id);
// 		}
// 	} catch (error) {
// 		console.log("error", error);
// 	}
// 	fs.writeFileSync(filePath, JSON.stringify(conversionsWithThread, null, 2));
// }


//await analyze();

const inboxes = {
	"heiß": "ib_sQfJRD9UpPXj4t8bhR57d",
	"lauwarm": "ib_Z5MyV0vdhEcJA6kngn9qw",
	"kalt": "ib_eFYBVkgHaXd6709DA2KIR",
	"warm": "ib_9WYkfWgXT76WzYnaMAwS4"
}

const prompt = `
	du bist eine KI, die WhatsApp Konversationen analysiert.
	Deine Aufgabe ist es, die Konversationen zu analysieren und zu verstehen und die Konversationen in eine phase zu unterteilen.
	Die Phasen sind:
	Noch im Eis, nie geantwortet - kalt 
	Potenzial - lauwarm
	Interesse erkannt - warm
	Abschlussbereit - heiß.

	du musst die Phasen durch die Funktion "changePhase" ändern.
	Die Funktion hat die Parameter "phase".
`

const changePhase =
{
	type: "function",
	function: {
		"name": "changePhase",
		"description": "Ändert die Phase einer WhatsApp-Konversation.",
		"strict": true,
		"parameters": {
			"type": "object",
			"properties": {
				"phase": {
					"type": "string",
					"description": "Die neue Phase der Konversation. Mögliche Werte: 'kalt', 'lauwarm', 'warm', 'heiß'."
				}
			},
			"additionalProperties": false,
			"required": [
				"phase"
			]
		},
	}
}


async function runGPT(threadId, conversationId) {
	const res = await openai.beta.threads.messages.list(threadId);
	const messages = res.data;
	if (!messages || messages.length === 0) {
		console.log("No messages found in the thread.");
		return;
	}
	let message = null;
	for (const msg of messages) {
		message += msg.role + ': ' + msg.content[0].text.value + '\n';
	}
	if (!message) {
		console.log(`No message found for ${conversationId}`);
		return;
	}
	const response = await openai.chat.completions.create({
		model: "gpt-4.1-mini",
		messages: [
			{ role: "system", content: prompt },
			{ role: "user", content: message }
		],
		tools: [changePhase],
		modalities: ["text"],
		n: 1,
	});
	const content = response.choices[0].message.content;
	const tools = response.choices[0].message.tool_calls;
	const changePhaseFunction = tools.find(tool => tool.function.name === "changePhase");
	if (changePhaseFunction) {
		const argJson = JSON.parse(changePhaseFunction.function.arguments);
		const { phase } = argJson;
		const inboxId = inboxes[phase];
		if (!inboxId) {
			console.error(`Invalid phase: ${phase}`);
			return;
		}
		console.log(`Changing phase of conversation ${conversationId} to ${phase} with inbox ID ${inboxId}`);
		try {
			const res2 = await changeConversationInbox(inboxId, conversationId, 'open');
		} catch (error) {
			console.error(`Error changing phase for conversation ${conversationId}:`, error);
			return;

		}
	}
}

//await runGPT("thread_FhsyES3LMl6SVlcbYiIQXlKu", "cv_eVfltqnznz1SM3xBr8Oqr");


async function analyze() {
	const conversations = JSON.parse(fs.readFileSync('./src/utils/conversations-with-threads.json', 'utf-8'));
	let links = '';
	try {
		for (let index = 0; index < conversations.length; index++) {
			const conversation = conversations[index];
			const {thread_id, id} = conversation;
			links += `https://app.superchat.de/inbox/${id}\n\n\n`;
			if (!thread_id){
				console.log("analyzing conversation", thread_id, id);
				const res = await changeConversationInbox("ib_eFYBVkgHaXd6709DA2KIR", id, 'open');
				console.log(res);
			} else {
				//await runGPT(thread_id, id);
			}
		}
	} catch (error) {
		console.log("error", error);
	}
	fs.writeFileSync('./src/utils/links.txt', links);
}

//await analyze();