import { userInfo, isDev } from "../config/index.js";
import { putMessageInThreadAssistant } from "../utils/fetch.js";
import { outboundMessageFilter } from "../utils/gptFilter.js";

export const ProcessData = async (req, res) => {
	const outboundMessageInfo = req.body;
	const userId = outboundMessageInfo.message.to[0].contact_id;
	const contentType = outboundMessageInfo.message.content.type;
	const phoneNummber = parseInt(outboundMessageInfo.message.to[0].identifier);
	res.status(200).send("Outbound message received");

	if ((!phoneNummber === "+4368181520584" && isDev) || (phoneNummber === "+4368181520584" && !isDev)) {
		return;
	}

	if (userInfo[userId]) {
		if (contentType === "whats_app_template") {
			userInfo[userId].template_id =
				outboundMessageInfo.message.content.template_id;
			userInfo[userId].outboundReceived = true;
			userInfo[userId].messageType = contentType;
		} else if (contentType === "whats_app_quick_reply") {
			userInfo[userId].quickReplayBody =
				outboundMessageInfo.message.content.body;
			userInfo[userId].outboundReceived = true;
			userInfo[userId].messageType = contentType;
		}
	} else if (
		await outboundMessageFilter(userId, phoneNummber, outboundMessageInfo.message.content.body)
	) {
		const phoneSring = "+" + phoneNummber.toString();
		const superchat_contact_id = outboundMessageInfo.message.to[0].contact_id;
		if (contentType === "whats_app_template") {
			const template_id = outboundMessageInfo.message.content.template_id;
			await putMessageInThreadAssistant(
				template_id,
				null,
				phoneSring,
				superchat_contact_id
			);
		} else if (contentType === "whats_app_quick_reply") {
			const quickReplayBody = outboundMessageInfo.message.content.body;
			await putMessageInThreadAssistant(
				null,
				quickReplayBody,
				phoneSring,
				superchat_contact_id
			);
		} else {
			const content = outboundMessageInfo.message.content.body;
			await putMessageInThreadAssistant(
				null,
				content,
				phoneSring,
				superchat_contact_id
			);
		}
	}
};
