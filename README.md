# Termey

A web terminal.

Allows users to use a terminal in the browser, just as if they were using SSH or a local terminal.

Termey uses authorization via system users and pam, which adds a level of security

## Features

- Works with all modern browsers
- On the go - no need to SSH
- Uses xterm.js, therefore works with almost all applications, even vim and nano
- Secure system login using pam
- Configurable startup shell
- IP bans after login limit hitting

## Screenshots

![Image 1](https://raw.githubusercontent.com/Gelbpunkt/termey/master/screenshots/termey1.png)

![Image 2](https://raw.githubusercontent.com/Gelbpunkt/termey/master/screenshots/termey2.png)

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

- node v10/12+
- npm (to install dependencies)
- python 2 (node-pty)
- pam-devel (to do authorization)
- make (node-pty)
