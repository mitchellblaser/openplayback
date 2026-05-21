import os
import signal
import psutil
import pyscreenshot
import time
from flask import Flask, send_from_directory, request
from flask_cors import CORS
import sys
import ipaddress
import platform
import subprocess

path = os.path.dirname(os.path.abspath(__file__))
os.makedirs(path + '/static', exist_ok=True)

app = Flask(__name__, static_folder= path + '/static')
CORS(app)

MEDIA_FOLDER = os.path.join(path, "media")
SCREENSHOT_INTERVAL_S = 3
DEBUG_FLAG = False

last_screenshot_time = 0

last_playing_argument = ''

# @app.route('/restart-ffmpeg')
@app.route('/play/file/<path>')
def play_file(path: str):
    print(path)
    _kill_ffmpeg()
    _play_ffmpeg(f'{MEDIA_FOLDER}/"{path}"')
    return 'OK'


os.makedirs(MEDIA_FOLDER, exist_ok=True)
@app.route('/upload-media/<filepath>', methods=['POST'])
def upload_media(filepath: str):
    if 'file' not in request.files:
        return {'error': 'No file uploaded',}, 400
    file = request.files['file']
    
    if file.filename == '':
        return {'error': 'Empty filename',}, 400
    
    safe_path = os.path.basename(filepath)
    save_path = os.path.join(MEDIA_FOLDER, safe_path)
    
    file.save(save_path)
    print(f"Saved file to {save_path}")
    
    return {'status': 'OK', 'path': save_path}

@app.route('/play/web/<url>')
def play_webpage(url: str):
    _kill_ffmpeg()
    os.system(f'chromium-browser --kiosk {url.replace("*", "/")}')
    return 'OK'

@app.route('/configure/network/get-info')
def get_network_ifaces():
    addrs = psutil.net_if_addrs()
    networkdata = []
    for interface_name, interface_addresses in addrs.items():
        try:
            if isinstance(ipaddress.ip_address(interface_addresses[0].address), ipaddress.IPv4Address):
                print(interface_addresses[0].netmask)
                networkdata.append({"interface": interface_name, "address": interface_addresses[0].address, "subnet": interface_addresses[0].netmask})
        except ValueError:
            pass
    return networkdata

@app.route('/configure/network/set/<interface>/<ip>/<mask>', methods=['POST'])
def set_network_iface(interface: str, ip: str, mask: str):
    system = platform.system()
    if system == "Windows":
        set_windows(interface, ip, mask)
    elif system == "Linux":
        set_linux(interface, ip, mask)
    elif system == "Darwin":
        set_macos(interface, ip, mask)
    return

@app.route('/play/stream/<url>')
def play_stream(url: str):    
    _play_ffmpeg(url=url.replace("*", "/"))
    return 'OK'

@app.route('/restart-ffmpeg')
def restart_ffmpeg():
    _kill_ffmpeg()
    time.sleep(1)
    _play_ffmpeg(last_playing_argument)
    return 'OK'

@app.route('/get-screenshot')
def get_screenshot():
    # print(time.time() - last_screenshot_time)
    if time.time() - last_screenshot_time >= SCREENSHOT_INTERVAL_S:
        _capture_screenshot()
    return send_from_directory(app.static_folder, 'latest_screenshot.png')

@app.route('/reboot')
def reboot_system():
    print("Reboot Requested...")
    if not DEBUG_FLAG:
        os.system('reboot')
    else:
        print("BUT we are in DEBUG mode.")
    return 'OK'

@app.route('/blank')
def _kill_ffmpeg():
    for process in psutil.process_iter(['name', 'pid']):
        if process.info['name'].upper() == "FFPLAY" or process.info['name'].upper() == "CHROMIUM":
            os.kill(process.info['pid'], signal.SIGTERM)
    return 'OK'

def _capture_screenshot():
    image = pyscreenshot.grab()
    image.save(path + "/static/latest_screenshot.png")
    return

def _play_ffmpeg(url):
    _kill_ffmpeg()
    global last_playing_argument
    last_playing_argument = url
    if DEBUG_FLAG:
        os.system('ffplay -loop 0 ' + url + '&')
    else:
        os.system('ffplay -loop 0 -fs ' + url + '&')
    return

def set_windows(interface, ip, mask):
    command = [
        "netsh",
        "interface",
        "ip",
        "set",
        "address",
        interface,
        "static",
        ip,
        mask,
    ]
    subprocess.run(command, check=True)
    return

def set_linux(interface, ip, mask):
    # Convert subnet mask to CIDR
    cidr = mask_to_cidr(mask)
    subprocess.run(
        [
            "sudo",
            "ip",
            "addr",
            "flush",
            "dev",
            interface,
        ],
        check=True,
    )
    subprocess.run(
        [
            "sudo",
            "ip",
            "addr",
            "add",
            f"{ip}/{cidr}",
            "dev",
            interface,
        ],
        check=True,
    )
    subprocess.run(
        [
            "sudo",
            "ip",
            "link",
            "set",
            interface,
            "up",
        ],
        check=True,
    )
    return

def set_macos(interface, ip, mask):
    router = "0.0.0.0"
    subprocess.run(
        [
            "sudo",
            "networksetup",
            "-setmanual",
            interface,
            ip,
            mask,
            router,
        ],
        check=True,
    )
    return

def mask_to_cidr(mask):
    return sum(
        bin(int(x)).count("1")
        for x in mask.split(".")
    )

if __name__ == '__main__':
    if "debug" in sys.argv:
        print("Running in DEBUG mode.")
        DEBUG_FLAG = True
        app.run(host='0.0.0.0', debug=True, port=8000)
    else:
        app.run(host='0.0.0.0')
