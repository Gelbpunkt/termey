# Termey

A web terminal.
Allows users to use a terminal in the browser, just as if they were using SSH or a local terminal.
Termey uses authorization via system users and pam, which adds a level of security

## Installation

```sh
git clone https://github.com/Gelbpunkt/termey
cd termey
npm i
sudo node .  # you will need sudo for pam to work
```

Then open http://localhost:7654 in your browser and login as usual - Done!

## Requirements

Termey is not planned to be working on Windows.

- node v10.16.0 (v12 will not work due to node-pty)
- npm (to install dependencies)
- python 2 (node-pty)
- pam-devel (to do authorization)
- make (node-pty)
