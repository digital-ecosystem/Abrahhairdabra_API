import { Router } from 'express';
import { runThread } from '../controllers/runThread.js';

const runThreadRoute = Router();

runThreadRoute.post('/runchatgpt', runThread);


export default runThreadRoute;