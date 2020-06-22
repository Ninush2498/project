let Player = null;
let Guess = null;
if (typeof module !== "undefined") {
    Guess = require("./Guess");
    Player = require("./Player");
}

class Game {

    static nextBoolean(bool, socket, next, args, gameID) {
        var f = document.createElement("div");
        var b1 = document.createElement("button");
        b1.innerHTML = "Yes";
        b1.style = "height: 30px; width: 60px; margin: 10px;";
        var b2 = document.createElement("button");
        b2.innerHTML = "No";
        b2.style = "height: 30px; width: 60px; margin: 10px;";
        f.appendChild(b1);
        f.appendChild(b2);
        b1.onclick = function () {
            f.parentElement.removeChild(f);
            bool.value = true;
            document.getElementById("paragraph").innerHTML = "";
            socket.emit('createMessage', {
                code: "answer",
                value: { answer: bool.value, continue: next, args: args, gameID: gameID }
            });
        };

        b2.onclick = function () {
            f.parentElement.removeChild(f);
            bool.value = false;
            document.getElementById("paragraph").innerHTML = "";
            socket.emit('createMessage', {
                code: "answer",
                value: { answer: bool.value, continue: next, args: args, gameID: gameID }
            });
        };
        document.getElementById("paragraph").appendChild(f);
    }

    static nextInteger(num, bigger, smaller, message, next, args) {
        var f = document.createElement("div");
        var b = document.createElement("button");
        b.type = "submit";
        b.style = "height: 20px; width: 60px; margin: 5px;";
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
            } else {
                f.parentElement.removeChild(f);
                num.value = Number(x);
                Game.check(num, bigger, smaller, message, next, args);
            }
        };
        s.addEventListener("keypress", function(event) {
            if (event.keyCode == 13) {
                b.click();
            }
        });
        document.getElementById("paragraph").appendChild(f);
    }

    static nextTurn(game) {
        if (game.guess.count == 1 && game.guess.value == 0 || game.ended) {
            game.newTurn = true;
            Game.newGame(game);
        } else {
            if (game.index < game.players.length-1) {
                game.index++;
            } else {
                game.index = 0;
            }
            if (game.players[game.index].isActive()) {
                game.players[game.index].play(game.players, game.guess);
            } else {
                Game.nextTurn(game);
            }
        }
    }

    static winnerPrinter(winner, p) {
        p[winner].win();
    }

    static newRoundPrinter(game) {
        for (var i=0; i<game.players.length; i++) {
            if (game.players[i].isActive()) {
                game.clients[i].emit('newMessage', {
                    code: 2,
                    value: "New round"
                });
            }
        }
        while(!game.players[game.index].isActive()) {
            if (game.index < game.players.length-1) {
                game.index++;
            } else {
                game.index = 0;
            }
        }
        game.players[game.index].askShow();
    }

    static newGame(game) {
        var p = game.players;
        var playing = 0;
        var winner = -1;
        for (var i = 0; i < p.length; i++) {
            if (p[i].isActive()) {
                playing++;
                winner = i;
            }
        }
        if (playing < 2) {
            game.ended = true;
            game.clients[winner].emit('newMessage', {
                code: 5,
                value: { winner: p[winner].dices }
            });
            Game.winnerPrinter(winner, p);
        } else {
            for (var pl of p) {
                if (pl.isActive()) {
                    pl.wannaRoll();
                }
            }
        }
    }

    static newGame2(game) {
        if (game.index < game.players.length-1) {
            game.index++;
        } else {
            game.index = 0;
        }
        Game.newRoundPrinter(game);
    }

    static createGame(n, m) {
        var players = new Array();
        for (var i = 0; i < n; i++) {
            players[i] = new Player(m);
        }
        return players;
    }

    static game(game) {
        Game.newGame(game);
    }

    static check(num, bigger, smaller, message, next, args) {
        if (num.value <= bigger || num.value > smaller) {
            alert(message);
            Game.nextInteger(num, bigger, smaller, message, next, args);
        } else {
            document.getElementById("paragraph").innerHTML = "";
            next(args);
        }
    }

    static send(args) {
        console.log(args);
        args.socket.emit('createMessage', {
            code: "do",
            value: { function: args.function, num: args.value.value, args: args.args, gameID: args.gameID }
        });
    }

    static gameStarter(args) {
        args.socket.emit('createMessage', {
            code: "start",
            value: { n: args.n1.value, m: args.n2.value, name: sessionStorage.getItem("name") }
        });
        if (args.n1.value == 2) {
            document.getElementById("paragraph").innerHTML = "Waiting for " + (args.n1.value-1) + " player to connect.";
        } else if (args.n1.value > 2) {
            document.getElementById("paragraph").innerHTML = "Waiting for " + (args.n1.value-1) + " players to connect.";
        } else {
            document.getElementById("paragraph").innerHTML = "Game";
        }
        alert("Game starts");
    }

    static continue(args) {
        var m = new Number();
        var s = "You need at least 1 and at most 50 dices to play. Please try again.";
        document.getElementById("paragraph").innerHTML = "Enter the number of dices:";
        Game.nextInteger(m, 0, 50, s, Game.gameStarter, { n1: args.n, n2: m, socket: args.socket });
    }

    static main(socket) {
        // TODO code application logic here
        var args = { n: new Number(), socket: socket }
        var s = "At least 2 and at most 10 players are required. Please try again.";
        document.getElementById("paragraph").innerHTML = "Enter the number of players:";
        Game.nextInteger(args.n, 1, 10, s, Game.continue, args);
    }

}


if (typeof module !== "undefined" && module.exports) {
    module.exports = Game;
}
