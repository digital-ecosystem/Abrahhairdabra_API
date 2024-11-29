import { getSuperchatRecord } from "../api/superchat.js";

export const getThread = async (contact_id) => {
  try {
    const response = await getSuperchatRecord(contact_id);
    if (response && response.custom_attributes) {
      for (var i = 0; i < response.custom_attributes.length; i++) {
        if (response.custom_attributes[i].id === "ca_FVJQyMAhr5B8y2uvi2hgj") {
          return response.custom_attributes[i].value;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error getting thread:", error);
  }
};

export async function UpdateThread(contact_id, threadId) {
  const SUPERCHAT_API_KEY = process.env.SUPERCHAT_API_KEY;
  const url = `https://api.superchat.com/v1.0/contacts/${contact_id}`;
  const options = {
    method: "PATCH",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "X-API-KEY": SUPERCHAT_API_KEY,
    },
    body: JSON.stringify({
      custom_attributes: [
        {
          id: "ca_FVJQyMAhr5B8y2uvi2hgj",
          value: threadId,
        },
      ],
    }),
  };
  return await fetch(url, options)
    .then((response) => response.json())
    .catch((err) => console.error(err));
}