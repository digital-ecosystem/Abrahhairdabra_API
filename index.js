import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bodyParser from 'body-parser';
import { config } from 'dotenv';
import vapi from './src/routers/vapi.js';
import ProcessIncomingMessages from './src/routers/incoming.js';
import ProcessÓutgoingMessages  from './src/routers/outgoing.js';
import runThread from './src/routers/runThread.js';
import "./src/utils/analyze-conversations.js"


config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const NGROK_AUTHTOKEN = process.env.NGROK_TOKEN;

app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(vapi);
app.use(ProcessIncomingMessages);
app.use(ProcessÓutgoingMessages);
app.use(runThread);

app.get('/', (req, res) => {
    res.send('Hello World!');
});



app.listen(PORT, () => {
  console.log('Server is running on http://localhost: ' + PORT);
});


