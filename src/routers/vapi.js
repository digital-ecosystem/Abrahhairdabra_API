import { Router } from 'express';
import { searchForAppointment, bookAppointment } from '../controllers/vapi.js';

const vapi = Router();

vapi.post('/search-for-appointment',searchForAppointment);
vapi.post('/book-appointment',bookAppointment);
vapi.post('/today-date',(req, res) => {
	var event = new Date();
	const id = req.body.message.toolCalls[0].id;
	console.log("the date of today is: ", event);
	const dateString = event.toString();
	return res.status(200).json(
		{
			"results": [
			  {
				"toolCallId": id,
				"result": dateString,
			  }
			]
		  }
	);
});

export default vapi;