import schedule from 'node-schedule';
import { getThread } from './superchat.js';
import { openai, OPENAI_ASSISTANT, blockingLebels, gpt_lebel } from '../config/index.js';
import { sendMessage, getSuperchatConveration } from '../api/superchat.js';

async function scheduleAt(id, runAt, userId, task,) {
  if (!scheduleAt.jobs) scheduleAt.jobs = {};

  if (scheduleAt.jobs[id]) {
    scheduleAt.jobs[id].cancel();
  }

  scheduleAt.jobs[id] = schedule.scheduleJob(runAt, async () => {
    await task(userId);
    delete scheduleAt.jobs[id];
  });
}

async function followUp(message) {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system", content: `
        You are a helpful assistant, the user didn't respond to the messages. you should follow up with them.
        For the followup it's crucial that you don't become repetetive for the followup. No generic things, no pressure, just a friendly casual and kind reference back to what the user told you before, connected to their goals, their original reason for contacting us and what moves them
        `
      },
      { role: "user", content: message }
    ],
    modalities: ["text"],
    n: 1,
  });
  const content = response.choices[0].message.content;
  return content;
}

// const response1 = await openai.beta.threads.messages.create("thread_uIzy5h9cOFLBExc0hqfyGRGr", { role: "assistant", content: "bitte die unterhaltung nachfassen, weil der Kunde nicht geantwortet hat" });
// let run = await openai.beta.threads.runs.createAndPoll("thread_uIzy5h9cOFLBExc0hqfyGRGr", { assistant_id: OPENAI_ASSISTANT });

async function checkLabels(contactId) {
  const conversation_record = await getSuperchatConveration(contactId);
  const lebels = conversation_record.results[0].labels;
  let checker = 0;

  lebels.forEach(lebel => {
    if (lebel.id === gpt_lebel) {
      checker = 1;
      lebels.forEach(lebel_1 => {
        if (blockingLebels.includes(lebel_1.id)) {
          console.log("user is going to be blocked brcause of lebel: ", lebel_1);
          checker = 0;
        }
      });
    }
  });
  if (checker) return true;
  return false;
}


async function task(userId) {
  console.log(`Running scheduled task for user ${userId}...`);
  const checker = await checkLabels(userId);
  if (!checker) return;
  const threadId = await getThread(userId);
  if (!threadId) {
    console.log(`No thread found for task ${userId}`);
    return;
  }
  console.log(`Retrieved thread for user ${userId}:`, threadId);
  const response = await openai.beta.threads.messages.list(threadId, { limit: 10 });
  const messages = response.data;
  if (messages && messages.length > 0) {
    // see if the last message is from the assistant then send the message to superchat
    const lastMessage = messages[messages.length - 1];
    const role = lastMessage.role; // set it back to the role
    if (role !== 'user') {
      // set the message to create the follow up message
      let message = null;
      for (const msg of messages) {
        message += msg.role + ': ' + msg.content[0].text.value + '\n';
      }
      if (!message) {
        console.log(`No message found for user ${userId}`);
        return;
      }
      const followUpMessage = await followUp(message);
      if (followUpMessage) {
        const res = await openai.beta.threads.messages.create(threadId, {
          role: "assistant",
          content: followUpMessage
        });
        await sendMessage(followUpMessage, userId);
        console.log(`Follow-up message sent for user ${userId}:`);
      }
    }
  }
}

//await task("ct_IJQAwPF4X4ucfKDDAnssc")

export { scheduleAt, task };