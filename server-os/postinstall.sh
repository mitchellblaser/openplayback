#!/bin/bash
# OpenPlayback Post Install Script for Debian

set -e

echo "OpenPlayback Post Install Script"
echo "===================================="

echo "Updating System..."
apt update && apt upgrade -y

echo "Installing core packages..."
apt install -y git wget curl build-essential nano tmux sudo grep coreutils network-manager

echo "Adding user to sudoers group..."
usermod -aG sudo openplayback

echo "Installing Desktop Environment..."
apt install -y xfce4 lightdm

echo "Installing Required Packages for OpenPlayback"
apt install -y python3 python3-pip chromium ffmpeg git

echo "Installing OpenSSH Server..."
apt install -y openssh-server

echo "Removing folders from Home Directory..."
rm -rf /home/openplayback/*

echo "Cloning OpenPlayback Repository..."
git clone https://github.com/mitchellblaser/openplayback /home/openplayback/openplayback

echo "Configuring LightDM Auto Login..."
sed -i '/^\[Seat:\*\]/a autologin-user=openplayback\nautologin-user-timeout=0' /etc/lightdm/lightdm.conf


echo "Removing normal Desktop Environment things..."
dpkg --remove --force-depends xfce4-panel

CONFIG_DIR="/home/openplayback/.config/xfce4/xfconf/xfce-perchannel-xml"
CONFIG_FILE="$CONFIG_DIR/xfce4-desktop.xml"

mkdir -p "$CONFIG_DIR"

cat > "$CONFIG_FILE" <<EOF
<?xml version="1.0" encoding="UTF-8"?>

<channel name="xfce4-desktop" version="1.0">
  <property name="desktop-icons" type="empty">
    <property name="style" type="int" value="0"/>
  </property>

  <property name="backdrop" type="empty">
    <property name="screen0" type="empty">
      <property name="monitor0" type="empty">
        <property name="workspace0" type="empty">
          <property name="color-style" type="int" value="0"/>
          <property name="image-style" type="int" value="0"/>
          <property name="rgba1" type="array">
            <value type="double" value="0"/>
            <value type="double" value="0"/>
            <value type="double" value="0"/>
            <value type="double" value="1"/>
          </property>
        </property>
      </property>
    </property>
  </property>
</channel>
EOF

echo "XFCE desktop configured."

echo "Configuring Autostart Scripts..."
cat > /usr/local/bin/openplayback-start.sh <<EOF
#!/bin/bash

export DISPLAY=:0
export XAUTHORITY=/home/openplayback/.Xauthority

cd /home/openplayback/openplayback/server

# Wait for desktop/network
sleep 5

python3 ./openplayback-server.py
EOF

chmod +x /usr/local/bin/openplayback-start.sh

cat > /etc/systemd/system/openplayback.service <<EOF
[Unit]
Description=OpenPlayback Startup Service
After=graphical.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=openplayback
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/openplayback/.Xauthority
ExecStart=/usr/local/bin/openplayback-start.sh
Restart=always
RestartSec=5

[Install]
WantedBy=graphical.target
EOF

systemctl daemon-reload
systemctl enable openplayback.service

echo "Installing python3 packages..."
pip install -r /home/openplayback/openplayback/server/requirements.txt --break-system-packages

echo "Fixing file ownership..."
chown -R openplayback:openplayback /home/openplayback

echo "Replacing default wallpaper..."
curl -O https://github.com/mitchellblaser/openplayback/raw/refs/heads/main/server-os/black-wallpaper.svg
rm /usr/share/backgrounds/xfce/xfce-x.svg
cp ./black-wallpaper.svg /usr/share/backgrounds/xfce/xfce-x.svg

CONFIG_FILE="/etc/lightdm/lightdm.conf"

echo "Configuring LightDM to hide the mouse cursor..."

# Ensure the config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Creating $CONFIG_FILE..."
    sudo touch "$CONFIG_FILE"
fi

# Ensure [Seat:*] section exists
if ! grep -q "^\[Seat:\*\]" "$CONFIG_FILE"; then
    echo "" | sudo tee -a "$CONFIG_FILE" > /dev/null
    echo "[Seat:*]" | sudo tee -a "$CONFIG_FILE" > /dev/null
fi

# Remove any existing xserver-command lines
sudo sed -i '/^#\?xserver-command=/d' "$CONFIG_FILE"

# Add the new xserver-command under [Seat:*]
sudo awk '
BEGIN { added=0 }
/^\[Seat:\*\]/ {
    print
    print "xserver-command=X -nocursor"
    added=1
    next
}
{ print }
END {
    if (!added) {
        print "[Seat:*]"
        print "xserver-command=X -nocursor"
    }
}
' "$CONFIG_FILE" | sudo tee "${CONFIG_FILE}.tmp" > /dev/null

sudo mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"

echo "Configuration updated successfully."

echo "Configuration..."
echo "Please enter your desired hostname. (eg. openplayback-1)"
read -p ">>> " newhostname

echo ""
echo "Setting hostname..."
hostnamectl set-hostname $newhostname
sudo sed -i "s/^127\.0\.1\.1.*/127.0.1.1\t$newhostname/" /etc/hosts


echo "Installation Finished. Rebooting..."
/sbin/reboot