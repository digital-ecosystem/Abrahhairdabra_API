import { Router } from 'express';
import { ProcessData } from '../controllers/incoming.js';

const incoming = Router();

incoming.post('/incoming', ProcessData);


export default incoming;