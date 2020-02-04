let Player = null;
let Guess = null;
if (typeof module !== "undefined") {
    Guess = require("./Guess");
    Player = require("./Player");
}

class Game {

    static nextBoolean(bool, socket, next, args) {
        var f = document.createElement("div");
        var b = document.createElement("button");
        b.type = "submit";
        b.innerHTML = "Submit";
        var s = document.createElement("input");
        f.appendChild(s);
        f.appendChild(b);
        var x;
        b.onclick = function () {
            x = s.value;
            if (!(x == "yes" || x == "no")) {
                alert("Must input yes or no.");
                f.parentElement.removeChild(f);
                Game.nextBoolean(bool, socket, next, args);
            }
            else {
                f.parentElement.removeChild(f);
                if (x == "yes") {
                    bool.value = true;
                } else {
                    bool.value = false;
                }
                socket.emit('createMessage', {
                    code: "answer",
                    value: { answer: bool.value, continue: next, args: args }
                });
            }
        };
        document.getElementsByTagName("body")[0].appendChild(f);
    }

    static nextInteger(num, bigger, smaller, message, next, args) {
        var f = document.createElement("div");
        var b = document.createElement("button");
        b.type = "submit";
        b.innerHTML = "Submit";
        var s = document.createElement("input");
        f.appendChild(s);
        f.appendChild(b);
        var x;
        b.onclick = function () {
            x = s.value;
            if (!Number.isInteger(Number(x))) {
                alert("Must input integer.");
                f.parentElement.removeChild(f);
                Game.nextInteger(num, bigger, smaller, message, next, args);
            }
            else {
                f.parentElement.removeChild(f);
                num.value = Number(x);
                Game.check(num, bigger, smaller, message, next, args);
            }
        };
        document.getElementsByTagName("body")[0].appendChild(f);
    }

    static nextTurn(p, guess) {
        if (guess.count == 1 && guess.value == 0) {
            Game.newGame(p, guess);
        } else {
            if (Game.index < p.length-1) {
                Game.index++;
            } else {
                Game.index = 0;
            }
            if (p[Game.index].isActive()) {
                p[Game.index].play(p, guess, Game.index);
            } else {
                Game.nextTurn(p, guess);
            }
        }
    }

    static winnerPrinter(winner, p) {
        p[winner-1].win();
    }

    static newRoundPrinter(p, clients) {
        for (var i=1; i<=p.length; i++) {
            if (p[i-1].isActive()) {
                clients.get(i).emit('newMessage', {
                    code: 2,
                    value: "New round"
                });
            }
        }
        while(!p[Game.index].isActive()) {
            if (Game.index < p.length-1) {
                Game.index++;
            }
            else {
                Game.index = 0;
            }
        }
        p[Game.index].wannaRoll2();
        p[Game.index].askShow();
    }

    static newGame(p) {
        var playing = 0;
        var winner = -1;
        for (var i = 0; i < p.length; i++) {
            if (p[i].isActive()) {
                playing++;
                winner = i;
            }
        }
        if (playing < 2) {
            Game.winnerPrinter(winner + 1, p);
        } else {
            for (var pl of p) {
                if (pl.isActive()) {
                    pl.wannaRoll();
                }
            }
        }
    }

    static newGame2(p, clients) {
        if (Game.index < p.length-1) {
            Game.index++;
        }
        else {
            Game.index = 0;
        }
        Game.newRoundPrinter(p, clients);
    }

    static createGame(n, m) {
        var players = new Array();
        for (var i = 0; i < n; i++) {
            players[i] = new Player(m);
            Game.count += m;
        }
        return players;
    }

    static game(players) {
        Game.newGame(players);
    }

    static check(num, bigger, smaller, message, next, args) {
        if (num.value <= bigger || num.value > smaller) {
            alert(message);
            Game.nextInteger(num, bigger, smaller, message, next, args);
        }
        else {
            next(args);
        }
    }

    static send(args) {
        args.socket.emit('createMessage', {
            code: "do",
            value: { function: args.function, num: args.value.value, args: args.args }
        });
    }

    static gameStarter(args) {
        Game.socket.emit('createMessage', {
            code: "start",
            value: { n: args.n1.value, m: args.n2.value }
        });
        if (args.n1.value == 2) {
            document.getElementById("paragraph").innerHTML = "Waiting for " + (args.n1.value-1) + " player to connect.";
        }
        else if (args.n1.value > 2) {
            document.getElementById("paragraph").innerHTML = "Waiting for " + (args.n1.value-1) + " players to connect.";
        }
        else {
            document.getElementById("paragraph").innerHTML = "Game";
        }
        alert("Game starts");
    }

    static continue(n) {
        var m = new Number();
        var s = "You need at least 1 and at most 50 dices to play. Please try again.";
        document.getElementById("paragraph").innerHTML = "Enter the number of dices:";
        Game.nextInteger(m, 0, 50, s, Game.gameStarter, { n1: n, n2: m });
    }

    static main() {
        // TODO code application logic here
        var n = new Number();
        var s = "At least 2 and at most 10 players are required. Please try again.";
        document.getElementById("paragraph").innerHTML = "Enter the number of players:";
        Game.nextInteger(n, 1, 10, s, Game.continue, n);
    }

 }

 Game.socket;
 Game.index = -1;
 Game.count = 0;

if (typeof module !== "undefined" && module.exports) {
    module.exports = Game;
}
