# OpenPlayback OS - Installation Steps

### Step 1: Installation
Please download the latest Debian Netinst Image and flash it to a USB. <br>
<b>Ensure you are connected to the internet for the installation, via ethernet and DHCP!!</b>

* <b>Locale</b>: Set this as required.

* <b>Hostname</b>: Leave this as default - we will change it later

* <b>Domain</b>: Leave this blank

* <b>Login Information</b>: It will ask you for Root Password, Full Name, Username, and Password. Please make everything `openplayback`.
The post install script relies on it, and will prompt you to change it later. 

### Step 2: Partition Disk

Partition your disk however you see fit, if you are unsure, use <b>Guided - Full Disk</b>, and <b>All files in one partition</b> when prompted.

### Step 3: Configure the Package Manager

When asked, click no to skip scanning additional media.

Select an archive mirror that is close to you, and leave proxy info blank.

### Step 4: Software Selection

Uncheck EVERYTHING when prompted.

### Step 5: Reboot when prompted

Reboot and login with credentials `openplayback` `openplayback`

### Step 6: Post-install script

Run the following commands to download and execute the postinstall script.

```bash
su - #(login with password openplayback)
apt install wget -y
bash -c "$(wget -O - https://github.com/mitchellblaser/openplayback/raw/refs/heads/main/server-os/postinstall.sh)"
```