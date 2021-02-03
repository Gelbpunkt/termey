// Useful links:
// https://stackoverflow.com/questions/4842424/list-of-ansi-color-escape-sequences
const app = require('fastify')({
    logger: {
        prettyPrint: {
            translateTime: 'h:MM:ss TT',
            colorize: true,
            ignore: 'pid,hostname'
        },
    },
})
const http = require("http");
const socketio = require("socket.io");
const pty = require("node-pty");
const pam = require("node-linux-pam");
const path = require("path");
const config = require("./config.json");

// Set up static file serving
app.register(require("fastify-static"), {
    root: path.join(__dirname, "static")
});

app.register(require('fastify-socket.io'));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getIp(socket) {
  if (config.behind_proxy) {
    return socket.handshake.headers["x-forwarded-for"];
  } else {
    return socket.request.connection.remoteAddress;
  }
}

// Banned IPs
var banned = [];

// Handle socketio connections
app.ready(function(err) {
    if (err) throw err;

    app.io.on("connection", async function(socket) {
      // Reject connection if they are banned
      if (banned.indexOf(getIp(socket)) != -1) {
        socket.disconnect(true);
        return;
      }
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
          banned.push(getIp(socket));
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
          pam.pamAuthenticate({username: credentials[0], password: credentials[1]}, async function(err) {
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
        // Spawn the pty
        var term = pty.spawn("su", ["-l", user], {
          name: "xterm-256color",
          cols: 80, // these will be resized anyways
          rows: 24,
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
          socket.disconnect(true);
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
});

app.listen(config.port, function() {
  console.log(`Termey listening on port ${config.port}`);
});
