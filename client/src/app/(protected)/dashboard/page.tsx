'use client'
import Home from '@/components/home/Home';
import Sidebar from '@/components/home/Sidebar';
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { fireBaseAuth, getAuthToken } from '@/helpers/firebase'
import { UserOrBool, StringAgentUndefined } from '@/types/user';
import constants from '@/helpers/constants';
import { useError } from '@/context/ErrorContext';
import { useLoader } from '@/context/LoaderContext';
import Rightsidebar from '@/components/home/Rightsidebar';
import AgentMessage from '@/types/websocket';
import { handleIncomingWorkspaceStatus } from '@/helpers/workspaceStatus';


//type promptRunning to be a string for true, false, or loading

type promptRunningType = "true" | "false" | "loading";



const ScreenComponent = () => {
    const { setError } = useError();
    const { setLoading } = useLoader();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
    const [profile, setProfile] = useState<UserOrBool>(false);
    const [currentAgentIndex, setCurrentAgentIndex] = useState<number | undefined>(undefined);
    const [agents, setAgents] = useState<StringAgentUndefined[]>([]);
    const [promptRunning, setPromptRunning] = useState<promptRunningType>("false");
    const [workspaceConnection, setWorkspaceConnection] = useState<boolean>(false);
    const [ws, setWS] = useState<WebSocket | null>(null);
    const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const toggleRightSidebar = () => setIsRightSidebarOpen(!isRightSidebarOpen);


    const setCurrentAgentIndexFetch = async (index: number, paramAgentID: string | undefined): Promise<void> => {
        if (currentAgentIndex === index) return
        setCurrentAgentIndex(index)
        if (!paramAgentID && (index + 1 > agents.length || !agents[index].agentID)) return
        const agentID = paramAgentID || agents[index].agentID;
        const token = await getAuthToken();
        const response = await fetch(constants.serverUrl + constants.endpoints.getAgentMessages + `?agentID=${agentID}`, { headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${token}` } });
        if (response.ok) {
            const data = await response.json();
            setAgentMessages(data.messages);
        }
    }


    const getAgent = async (): Promise<void> => {
        const token = await getAuthToken();
        setLoading({ text: '' });
        const response = await fetch(constants.serverUrl + constants.endpoints.getUsersAgent, {
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${token}`,
            },
        });
        if (response.ok) {
            const data = await response.json();
            setAgents(data.agents);
            setCurrentAgentIndexFetch(0, data.agents.length > 0 ? data.agents[0].agentID : undefined);
            setupWebsocket(data.agents[0].agentID);
            setLoading(false);
            return
        }
        setError({ primaryMessage: 'Failed to fetch your agents', secondaryMessage: 'Please try again later', timeout: 5000 });
        setLoading(false);
    }

    const addAgent = async () => {
        setLoading({ text: 'Adding a new agent' });
        const token = await getAuthToken();
        const response = await fetch(constants.serverUrl + constants.endpoints.addAgent, {
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${token}`,
            },
        });
        if (response.ok) {
            setLoading(false);
            const data = await response.json();
            setAgents(data.agents);
            const index = data.agents.length - 1;
            setCurrentAgentIndexFetch(index, data.agents[index].agentID);
            setupWebsocket(data.agents[index].agentID);
            return
        }
        setLoading(false);
        setError({ primaryMessage: 'We have sadly run out of available agents, we are working quickly to add more.', secondaryMessage: 'Email gautamsharda001@gmail.com to get an agent today.', timeout: 20000 });
    }

    const setupWebsocket = async (agentID: string) => {
        const newWS = new WebSocket(constants.websocketUrl);

        const onOpen = () => { newWS.send(JSON.stringify({ type: 'config', agentID, connectionType: 'client' })); }


        const handleMessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            console.log('');
            console.log('incoming webscoket message');
            console.log(data)
            if (data.type === 'config') handleConfig(data);
            if (data.type === 'workspaceStatus') handleWorkspaceStatus(data);
            if (data.type === 'error') handleError(data);
        }


        const handleConfig = (data: any) => {
            const { workspaceConnection, promptRunning } = data;
            if (data.successAlert) setError({ primaryMessage: 'workspace connection has been found', timeout: 5000, type: 'success' });
            if (!workspaceConnection) setError({ primaryMessage: `Your Agent's Workspace is currently not running`, secondaryMessage: 'Conact gautamsharda001@gmail.com to get it back up. Sorry our infra dev was sick today!', timeout: 15000 })
            setPromptRunning(promptRunning);
            setWorkspaceConnection(workspaceConnection);
        }

        const handleError = (data: any) => {
            setError({ primaryMessage: data.message, secondaryMessage: data.secondaryMessage || '', timeout: 5000 });
        }

        const handleWorkspaceStatus = (data: any) => {
            const payload: AgentMessage[] = data.payload;
            const workspaceMessages = handleIncomingWorkspaceStatus(payload, agentMessages);
            setAgentMessages(workspaceMessages);
        }

        newWS.onopen = onOpen;
        newWS.onmessage = handleMessage;
        setWS(newWS);
        return () => newWS.close();
    }

    const sendMessage = (message: Object): void => {
        if (ws) ws.send(JSON.stringify({ type: 'prompt', ...message }));
    }

    const stopAgent = (): void => {
        if (ws) ws.send(JSON.stringify({ type: 'terminate' }));
    }

    useEffect(() => {
        getAgent();
        const unsubscribe = onAuthStateChanged(fireBaseAuth, (user) => {
            if (user) {
                setProfile({ profilePicture: user.photoURL || '', name: user.displayName || '', email: user.email ? user.email.split('@')[0] + ' ...' : '' });
                return
            }
            setProfile(false);
        });
        return () => { unsubscribe(); }
    }, []);

    const setCurrentAgentIndexWrapper = (index: number): void => {
        if (currentAgentIndex === index) return
        ws?.close()
        setPromptRunning("false")
        setAgentMessages([])
        setWorkspaceConnection(false)
        setError(undefined);
        setWS(null)
        setCurrentAgentIndexFetch(index, undefined)
        setupWebsocket(agents[index].agentID);
    }

    return (
        <div className="relative min-h-screen bg-background">
            <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} profile={profile} agents={agents} currentAgentIndex={currentAgentIndex} addAgent={addAgent} setCurrentAgentIndex={setCurrentAgentIndexWrapper} />
            <Home isSidebarOpen={isSidebarOpen} isRightSidebarOpen={isRightSidebarOpen} toggleSidebar={toggleSidebar} toggleRightSidebar={toggleRightSidebar} agent={(agents.length === 0 || currentAgentIndex === undefined) ? undefined : agents[currentAgentIndex]} promptRunning={promptRunning} workspaceConnection={workspaceConnection} sendMessage={sendMessage} currentAgentIndex={currentAgentIndex} stopAgent={stopAgent} />
            <Rightsidebar isSidebarOpen={isRightSidebarOpen} toggleSidebar={toggleRightSidebar} agentMessages={agentMessages} />
        </div>
    );
};

export default ScreenComponent;
