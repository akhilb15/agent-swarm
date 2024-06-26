import logging
import pyautogui
pyautogui.FAILSAFE = False
import time
from flask import Flask, request
from flask.cli import AppGroup
from flask_cors import CORS
import base64
import requests
import io
from io import BytesIO
from werkzeug.serving import run_simple
import os
import subprocess
import threading
import signal
import obsws_python as obs

DONE = True
app = Flask(__name__)
CORS(app)

directory = r"D:\\Users\\Demo2\\open_interpreter-0.2.4"
os.chdir(directory)

startup_info = subprocess.STARTUPINFO()
startup_info.dwFlags |= subprocess.STARTF_USESHOWWINDOW
# reka: redacted	
open_interpreter_process = subprocess.Popen(
    ["poetry", "run", "interpreter", "--os", "--api_key", "redacted", "--model", "anthropic/claude-3-haiku-20240307"],
    # ["poetry", "run", "interpreter", "--os", "--model", "openai/gpt-4o"],
    # ["poetry", "run", "interpreter", "--os", "--api_key", "redacted", "--model", "huggingface/Efficient-Large-Model/Llama-3-VILA1.5-8B"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    startupinfo=startup_info,
    text=True,
    cwd=directory
)

# Start OBS Studio
def start_obs_studio():
    directory = r"C:\\Program Files\\obs-studio\\bin\\64bit"  # Replace with the actual path to your OBS Studio executable
    os.chdir(directory)
    # Start OBS Studio without opening the user interface
    subprocess.Popen(["obs64.exe", "--disable-shutdown-check", "--minimize-to-tray"], creationflags=subprocess.DETACHED_PROCESS) # , "--startstreaming"
    time.sleep(5) # Wait for open

# Start OBS stream
def start_obs_stream():
    host = "localhost"
    port = 4444
    # password = "your_obs_websocket_password"
    cl = obs.ReqClient(host=host, port=port) #, password=password)

    try:
        # print(cl.get_output_list().outputs)
        # Set the stream settings
        # stream_settings = {
        #     "server": "rtmp://173.255.225.188/stream",
        #     "key": "teststream?pwd=Gautam151102"
        # }
        # cl.set_output_settings("rtmp_output", stream_settings)

        # Start streaming
        cl.start_stream()
        print("OBS streaming started")
    except Exception as e:
        print(f"Error starting OBS stream: {str(e)}")

# Start OBS Studio and then start the stream
start_obs_studio()
start_obs_stream()

def read_from_process():
    for line in open_interpreter_process.stdout:
        print(line.strip())
    for line in open_interpreter_process.stderr:
        print(f"Error: {line.strip()}")

threading.Thread(target=read_from_process, daemon=True).start()

@app.route('/message', methods=['POST'])
def handle_message():
    global DONE
    message = request.json['message']
    try:
        open_interpreter_process.stdin.write(message + "\n")
        open_interpreter_process.stdin.flush()
        DONE = False
    except Exception as e:
        print(f"Error sending message to subprocess: {str(e)}")
    while not DONE:
        time.sleep(0)
    print('we are now done in start_new.py')
    return 'Message sent to subprocess'

@app.route('/done', methods=['GET'])
def doneFunction():
    global DONE
    print('reached /done')
    DONE = True
    return 'Done'

@app.route('/stop', methods=['GET'])
def stop():
    if DONE:
        return 'Agent not doing a task'
    else:
        try:
            # Send CTRL+C signal to the subprocess
            open_interpreter_process.send_signal(signal.SIGINT)
            return 'Agent stopped'
        except Exception as e:
            print(f"Error sending CTRL+C signal to subprocess: {str(e)}")
            return 'Error stopping agent'

@app.route('/test', methods=['GET'])
def test():
    return 'Live'

if __name__ == '__main__':
    run_simple('0.0.0.0', 8000, app)