// Useful links:
// https://stackoverflow.com/questions/4842424/list-of-ansi-color-escape-sequences
var express = require("express");
var http = require("http");
var socketio = require("socket.io");
var pty = require("node-pty");
var pam = require("authenticate-pam");
var config = require("./config.json");

// Set up socketio and express
var app = express();
var server = http.createServer(app);
var io = socketio(server);

// Set up static file serving
app.use(express.static("static"));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle socketio connections
io.on("connection", async function(socket) {
  // Greet the user
  const MAX_ATTEMPTS = config.max_login_attempts + 1;
  var attempt = 0;

  socket.emit(
    "data",
    "\033[1mWelcome to \033[33mtermey\033[39m v1.0.0\033[0m\r\n\r\n"
  );

  async function promptLogin() {
    // Prompt a single login attempt and stop if too many
    attempt++;
    if (attempt == MAX_ATTEMPTS) {
      socket.emit("data", "\r\n\r\nToo many failures.");
      return;
    }

    var credentials = [""];
    socket.emit("data", "\r\nUser: ");

    async function handle(data) {
      // Add to password if it's not a line feed, and remove if it's backspace
      if (data.charCodeAt(0) != 13) {
        var str = credentials[credentials.length - 1];
        if (data.charCodeAt(0) == 8) {
          credentials[credentials.length - 1] = str.substring(
            0,
            str.length - 1
          );
        } else {
          credentials[credentials.length - 1] = str + data;
        }
        if (credentials.length == 1) {
          socket.emit("data", data);
        }
      } else {
        if (credentials.length == 1) {
          credentials.push("");
          socket.emit("data", "\r\nPassword: ");
        } else {
          await verify();
        }
      }
    }

    socket.on("data", handle);

    async function verify() {
      // We got the credentials already
      socket.removeListener("data", handle);
      pam.authenticate(credentials[0], credentials[1], async function(err) {
        if (err) {
          socket.emit("data", `\r\n${err}`);
          // Error, retry
          promptLogin();
        } else {
          socket.emit("data", "\r\n");
          // Success, shell!
          await runShell(credentials[0], credentials[1]);
        }
      });
    }
  }

  async function runShell(user, passwd) {
    // Use current env
    const env = Object.assign({}, process.env);
    env["COLORTERM"] = "truecolor";
    // Spawn the pty
    var term = pty.spawn("su", ["-l", user], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      // cwd: env.HOME,
      // env: env,
      encoding: "utf8"
    });

    // Handle xterm.js input
    socket.on("data", function(data) {
      if (term) {
        term.write(data);
      }
    });

    // Resize properly
    socket.on("resize", function(cols, rows) {
      if (term) {
        term.resize(cols, rows);
      }
    });

    // Send back output
    term.on("data", function(data) {
      socket.emit("data", data);
    });

    socket.emit("data", "\r\n"); // add a newline
    socket.emit("login"); // force resize to client sizes

    // Terminal exit handler
    term.on("close", function() {
      term = null;
    });

    // Kill terminal on disconnect
    socket.on("disconnect", function() {
      if (term) {
        term.kill();
      }
    });
  }

  await promptLogin();
});

server.listen(config.port, function() {
  console.log(`Termey listening on port ${config.port}`);
});
