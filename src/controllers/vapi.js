import { search_for_available_slots, book_appointment } from '../api/zohobookings.js';

export const searchForAppointment = async (req, res) => {
	console.log(req.body);
	if (!req.body.message.toolCalls && !req.body.message.toolCalls.length) {
		return res.status(400).send('No tool calls found');
	}
	const tool = req.body.message.toolCalls[0];
	const  id  = tool.id;
	const functionToCll = tool.function;
	console.log('functions:', functionToCll);
	if (functionToCll.name){
		const { name, arguments: argumentsForFatuon } = functionToCll;
		if (name === 'search_for_available_slots') {
			const { appointment_location, service_id, date } = argumentsForFatuon;
			if (appointment_location === 'online'){
				const available_slots = await search_for_available_slots(date, service_id);
				console.log('available_slots:', available_slots);
				console.log(date, service_id);
				return res.status(200).json(
					{
						"results": [
						  {
							"toolCallId": id,
							"result": available_slots,
						  }
						]
					  }
				);
			} else if (appointment_location === 'in_person'){
				const available_slots = await search_for_available_slots(date, service_id);
				console.log('available_slots:', available_slots);
				console.log(date, service_id);
				return res.status(200).json(
					{
						"results": [
						  {
							"toolCallId": id,
							"result": available_slots,
						  }
						]
					  }
				);
			}
		}
			
	}
	res.status(200).json(
		{
			"results": [
			  {
				"toolCallId": id,
				"result": "no appointment was found",
			  }
			]
		  }
		  
	);
};

export const bookAppointment = async (req, res) => {
	console.log(req.body);
	if (!req.body.message.toolCalls && !req.body.message.toolCalls.length) {
		return res.status(400).send('No tool calls found');
	}
	const tool = req.body.message.toolCalls[0];
	const  id  = tool.id;
	const functionToCll = tool.function;
	console.log('functions:', functionToCll);
	if (functionToCll.name){
		const { name, arguments: argumentsForFatuon } = functionToCll;
		if (name === 'book_appointment') {
			const { name, email, service_id, date } = argumentsForFatuon;
			const response = await book_appointment(date, email, name, null, null, service_id);
			console.log('available_slots:', response);
			console.log(date, service_id);
			return res.status(200).json(
				{
					"results": [
						{
						"toolCallId": id,
						"result": response,
						}
					]
					}
			);
		}
			
	}
	res.status(200).json(
		{
			"results": [
			  {
				"toolCallId": id,
				"result": "no appointment was found",
			  }
			]
		  }
		  
	);
};