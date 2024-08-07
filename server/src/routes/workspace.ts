if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}
import catchAsync from '../methods/catchAsync';
import express, { Response, NextFunction, Request } from 'express';
import { websockObject } from '../app';

const WorkspaceRouter = express.Router();


WorkspaceRouter.get('/promptComplete/:agentID',  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const agentID = req.params.agentID;

    if (!websockObject) return res.status(400).send({ message: 'Websocket not initialized' });

    websockObject.setPromptRunningThroughChild(agentID, "false");

    res.status(200).send({ message: 'Account Created' });
}));

WorkspaceRouter.get('/test1',  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    console.log('test1');
    res.status(200).send({message: 'test1'});
}));

WorkspaceRouter.get('/test2',  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    console.log('test2');
    res.status(200).send({message: 'test2'});
}));

WorkspaceRouter.get('/test3',  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    console.log('test3');
    res.status(200).send({message: 'test3'});
}));

export default WorkspaceRouter;