import { SUPERCHAT_API_KEY, SUPERCHATCHANNEL_ID } from '../config/index.js';

export async function getSuperchatRecord(contact_id) {
    const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-API-KEY': SUPERCHAT_API_KEY
        }
      };
      
      return await fetch(`https://api.superchat.com/v1.0/contacts/${contact_id}`, options)
        .then(response => response.json())
        .catch(err => console.error(err));
}

export async function sendMessage(message, contact_id) {
  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'X-API-KEY': SUPERCHAT_API_KEY
    },
    body: JSON.stringify({
      to: [{identifier: contact_id}],
      from: {channel_id: SUPERCHATCHANNEL_ID, name: 'WhatsApp'},
      content: {type: 'text', body: message}
    })
  };
  
  fetch('https://api.superchat.com/v1.0/messages', options)
    .then(response => response.json())
    .catch(err => console.error(err));
  
}

export async function getSuperchatConveration(contact_id) {
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'X-API-KEY': SUPERCHAT_API_KEY
    }
  };
  
  return fetch(`https://api.superchat.com/v1.0/contacts/${contact_id}/conversations`, options)
    .then(response => response.json())
    .catch(err => console.error(err));
}

export async function getContentTemplateFromSuperchat(template_id)
{
    const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-API-KEY': SUPERCHAT_API_KEY
        }
      };
      
      return fetch(`https://api.superchat.com/v1.0/templates/${template_id}`, options)
        .then(response => response.json())
        .catch(err => console.error(err));
}

export async function listConversations(after = null) {
  const url = `https://api.superchat.com/v1.0/conversations?limit=100${after ? "&after=" + after : ""}`;
const options = {
  method: 'GET', 
  headers: {
    accept: 'application/json',
    'X-API-KEY': SUPERCHAT_API_KEY
  }
};

  return fetch(url, options)
    .then(res => res.json())
    .catch(err => console.error(err));
}


export async function changeConversationInbox(inboxId, conversationId, status) {
  const url = `https://api.superchat.com/v1.0/conversations/${conversationId}`;
  const options = {
    method: 'PATCH',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'X-API-KEY': SUPERCHAT_API_KEY
    },
    body: JSON.stringify({
      inbox_id: inboxId,
      status: status
    })
  };

return fetch(url, options)
  .then(res => res.json())
  .catch(err => console.error(err));
}