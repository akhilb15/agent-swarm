import WebSocket from "ws";
import WebSocketObject from "./Socket";
import axios from 'axios';
import Agent from "../models/Agent";

class WorkspaceConnection {
    ws: WebSocket;
    agentID: string;
    uniqueID: string;
    promptrunning: boolean;
    parent: WebSocketObject;

    constructor(ws: WebSocket, agentID: string, uniqueID: string, parent : WebSocketObject) {
        this.ws = ws;
        this.agentID = agentID;
        this.uniqueID = uniqueID;
        this.parent = parent;
    }

    init() {
        this.parent.sendMessageToAllNeighborClients(this.agentID, 'config', {promptRunning: this.getPromptRunning(), workspaceConnection : true, successAlert: true});   
    }

    getPromptRunning() : boolean {
        return this.parent.getPromptRunning(this.agentID);
    }

    setPromptRunning(promptrunning : boolean) : void {
        if (promptrunning === this.getPromptRunning()) return;
        this.parent.sendMessageToAllNeighborClients(this.agentID, 'config', {promptRunning: promptrunning, workspaceConnection : true});
        this.parent.setPromptRunning(this.agentID, promptrunning);
    }

    async handleMessage(message : any) : Promise<void> {
        if (message.sender && message.sender === 'client') {
            this.parent.sendMessageToAllNeighborClients(this.agentID, 'workspaceStatus', {payload : message.payload});

            for (let subsect of message.payload) {
                this.parent.addToMessageStack(this.agentID, subsect);
            }
            return
        }
        this.parent.addToMessageStack(this.agentID, message);
        this.parent.sendMessageToAllNeighborClients(this.agentID, 'workspaceStatus', {payload : [message]});
    }

    async handleClose() {
        this.parent.sendMessageToAllNeighborClients(this.agentID, 'config', {promptRunning: this.getPromptRunning(), workspaceConnection : false});
        this.parent.closeConnection(this.uniqueID);
    }


    async handleTerminate() : Promise<void> {
        try {
            const agent = await Agent.findById(this.agentID);
            if (!agent) return;
            console.log(this.agentID);
    
            const url : string = `${agent.ipAddress}/stop`;
            this.setPromptRunning(false);
            this.parent.addToMessageStack(this.agentID, {end: "true"});
            const res = await axios.get(url, {headers: {'Content-Type': 'application/json'}});
            
            if (res.status !== 200) return;
            return res.data;

        } catch (error) {
            // console.log(error);
            console.log('internal error at workspace connection on terminate');
            return;
        }
    }

    async talkToagent(message : string) : Promise<string> {
        try {
            const agent = await Agent.findById(this.agentID);
            if (!agent) return "agent not found";
    
            const url : string = `${agent.ipAddress}/message`;
            const data = {message: message, first: 0}
            try {
                await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
            } catch (error) {}
            // const response = await axios.post(url, data, {headers: {'Content-Type': 'application/json'}});
            // console.log(response)
            // console.log('talk to agent has a response (websocket')
            return

        } catch (error) {
            // console.log(error);
            console.log('internal error at workspace connection on talk to agent');
            return;
        }
    }
}

export default WorkspaceConnection;