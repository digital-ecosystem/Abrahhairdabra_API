import { Router } from 'express';
import { ProcessData } from '../controllers/outgoing.js';

const outgoing = Router();

outgoing.post('/outgoing', ProcessData);

export default outgoing;