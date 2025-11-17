# This is README file that explains the conents in this directory

# There are two directories and two files: 
# Directories:
# a. codes-local(host)
# so72-codes-local 
# b. codes-remote(host)
# so72-codes-remote 
# Files (ethics): 
# c. so72 - participant information sheet 
# d. so72 - participant-debrief

# User Manual:
# a. codes-local(host)
# I assume you are on lab pc to local-host the server.
# Given you downloaded my submission folder to Downloads dirctory, 

# 0. Open terminal and type the follwing commands:
# 1. Go to so72-codes-local directory 
cd Downloads/so72-visco2fly/so72-codes-local 

# 2. Install nvm to upgrade
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# Restart your terminal or run:
source ~/.bashrc
# Install latest LTS version
nvm install --lts
# Use the latest version
nvm use --lts
# Set it as default
nvm alias default node

# 3. Go to the backend directory to local-host the server
cd backend
npm install
node server.js

# 4. Open another terminal and Go to frontend directory to run frontend
cd ../frontend/
npm install
npm run dev

# you will see the local address that looks like: http://localhost:(number)/
# copy this line and paste in the browser address bar, and press enter

# 5. PRESS CTRL + Z on the terminal to terminate the server locally being hosted
# Also CTRL + Z on the terminal to terminate the client (React)

# b. codes-remote(host)
# I assume you are on lab pc to remote-host the server
# In this instruction, <username> refers your username like so72 
# Given you downloaded my submission folder to Downloads dirctory, 

# 0. Open terminal and type the following commands:

# 1. move so72-codes-remote directory into your Documents directory
mv Downloads/so72-visco2fly/so72-codes-remote /home/<username>/Documents/

# 2. Access ssh (you may be asked to type password)
ssh <username>@<username>.teaching.cs.st-andrews.ac.uk

# 3. Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# Restart your terminal or run:
source ~/.bashrc
# Install latest LTS version
nvm install --lts
# Use the latest version
nvm use --lts
# Set it as default
nvm alias default node

# 4. Install dependencies and build the project
cd /cs/home/<username>/Documents/so72-codes-remote/frontend
npm run build

# 5. Disable the defualt config
mv /host/<username>/nginx.d/default/_global.conf /host/<username>/nginx.d/default/_global.conf.bak

# 6. Create visco2fly config
touch /host/<username>/nginx.d/default/visco2fly.conf

# 7. Open text editor
nano /host/<username>/nginx.d/default/visco2fly.conf

# 8. Once conf file is open, COPY the codes below and PASTE to the file
# Don't forget change the username to yours! 

location /api/ {
   proxy_pass http://127.0.0.1:2800/;
}

location / {
   root /cs/home/<username>/Documents/so72-codes-remote/frontend/dist/;
   try_files $uri $uri/ /index.html;
}

# PRESS CTRL + S for save and CTRL + X for closing the edited file

# 9. Reload nginx
nginx -c /host/<username>/nginx.conf -s reload

# 10. Open tmux
tmux new -s visco2fly

# 11. Go to the directory where server file is located
cd /cs/home/<username>/Documents/so72-codes-remote/backend

# 12. Run server
npm install
node server.js

# It will work if you type the following address
https://<username>.teaching.cs.st-andrews.ac.uk/

# 13. PRESS CTRL + Z for terminating the server remotely being hosted and type this:
tmux kill-server

# Files (c & d)
# These files were provided to the survey participants 

# User manual was created on the basis of St Andrews Uni's CS wiki page (https://wiki.cs.st-andrews.ac.uk/index.php?title=Web_Service) that explains how to host web contents

 