#!/bin/bash
set -e

echo "=== Cleaning up existing MongoDB repos ==="
sudo rm -f /etc/apt/sources.list.d/mongodb-org*.list

echo "=== Installing curl and gnupg ==="
sudo apt-get update
sudo apt-get install -y gnupg curl

echo "=== Importing MongoDB GPG Key ==="
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes

echo "=== Adding MongoDB 7.0 Repository ==="
# Using jammy (22.04) repository which is compatible with noble (24.04)
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

echo "=== Updating Package Database ==="
sudo apt-get update

echo "=== Installing MongoDB Package ==="
sudo apt-get install -y mongodb-org

echo "=== Starting MongoDB Service ==="
sudo service mongod start || sudo systemctl start mongod

echo "=== Verifying MongoDB Service Status ==="
sudo service mongod status
