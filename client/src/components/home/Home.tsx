'use client';
import React, { useEffect, useState } from 'react'
import Icon from '../ui/icon'
import clsx from 'clsx'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { StringAgentUndefined } from '@/types/user';
import Videoplayer from './Videoplayer';
import { Loader } from '../Loader';

interface HomeInterface {
    isSidebarOpen: boolean;
    isRightSidebarOpen: boolean;
    toggleSidebar: () => void;
    toggleRightSidebar: () => void;
    agent: StringAgentUndefined | undefined;
    promptRunning: boolean;
    sendMessage: (message: Object) => void;
    currentAgentIndex: number | undefined;
    stopAgent: () => void;
}

export default function Home({ isSidebarOpen, isRightSidebarOpen, toggleSidebar, toggleRightSidebar, agent, promptRunning, sendMessage, currentAgentIndex, stopAgent }: HomeInterface) {
    return (
        <>
            {/* Button to toggle sidebar from the main content area */}
            <div className={clsx(isSidebarOpen && 'hidden', 'absolute top-4 left-4 z-10 duration-200')}>
                <Icon type="hamburger" onClick={toggleSidebar} hideBorder={true} />
                {/* {(agent && typeof agent !== "string") && <p className='font-mono text-2xl text-red-500'>We have agent {JSON.stringify(agent)}</p>} */}
            </div>
            <div className={clsx(isRightSidebarOpen && 'hidden', 'absolute top-4 right-4 z-10 duration-200')}>
                <Icon type="EnvelopeOpenIcon" onClick={toggleRightSidebar} hideBorder={true} />
                {/* {(agent && typeof agent !== "string") && <p className='font-mono text-2xl text-red-500'>We have agent {JSON.stringify(agent)}</p>} */}
            </div>
            <div className={`flex-1 min-h-screen transition-margin duration-300 ease-in-out ${isSidebarOpen ? "ml-64" : "ml-0"} ${isRightSidebarOpen ? "mr-72" : "mr-0"}`}>
                <div className='w-full h-full flex flex-col items-center justify-start'>
                    <div className='w-full h-full flex flex-col items-center justify-start'>
                        <div className='h-full flex flex-col items-center justify-start w-[70%]'>
                            <h1 className='font-mono text-4xl mt-8 font-bold 2xl:text-6xl'>Agent Livestream</h1>
                            <Agent agent={agent} />
                            <MessageInput sendMessage={sendMessage} promptRunningFake={promptRunning} currentAgentIndex={currentAgentIndex} stopAgent={stopAgent} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

function Agent({ agent }: { agent: StringAgentUndefined | undefined }) {
    // const agentIndex = selectedAgent === "Demo" ? 0 : 1; // Assuming "Demo" is index 0 and "Untitled" is index 1

    return (
        <div className={clsx('w-full mt-8 aspect-video', agent === undefined && 'border-2 border-primary rounded-md')}>
            {typeof agent === 'string' && <p className='font-mono text-2xl text-red-500'>{agent}</p>}
            {typeof agent === 'object' && (
                <>
                    <Videoplayer path={agent.streamingLink} />
                    {/* <p className='font-mono mt-2'>Agent Index: {agentIndex}</p> */}
                </>
            )}
            {agent === undefined && (
                <Loader text="Fetching agent details" className='w-full h-full flex items-center justify-center' />
            )}
        </div>
    )
}

interface MessageInputInterface {
    sendMessage: (message: Object) => void;
    promptRunningFake: boolean;
    currentAgentIndex: number | undefined;
    stopAgent: () => void;
}

function MessageInput({ sendMessage, promptRunningFake, currentAgentIndex, stopAgent }: MessageInputInterface) {
    const [prompt, setPrompt] = useState<string>("");
    const sendMessageWrapper = () => {
        sendMessage({ message: prompt });
        setPrompt("");
    }


    useEffect(() => {
        setPrompt("");
    }, [currentAgentIndex])

    return (
        <div className='flex flex-row items-start justify-start mt-8 w-full'>
            <Input type="text" value={prompt} onChange={(e) => { setPrompt(e.target.value) }} placeholder="Message" className='w-full border-border placeholder:font-mono' />
            {!promptRunningFake && <Button type="submit" className='ml-3 font-mono w-24' onClick={sendMessageWrapper}>Submit</Button>}
            {promptRunningFake && <Button type="submit" className='ml-3 font-mono w-24 bg-red-400 text-white' onClick={stopAgent}>Stop</Button>}
        </div>
    )
}