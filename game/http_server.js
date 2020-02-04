const express = require("express");
const socket = require("socket.io");
const app = express();
const http = require("http");
const port = 3000;
const server = http.createServer(app);
const io = socket(server);
const fs = require("fs");
const mask = require("json-mask");

var numOfConnections = {value: 0};

let clients = new Map();
var start = false;
const Game = require("./public/Game");
const Guess = require("./public/Guess");
var Player = require("./public/Player");
var n;
var m;
var players;
var guess;
var connected = 0;
var updated = 0;
var ip = new Array();
var state = {
    numOfPlayers: null,
    numOfDices: null, //spolu
    numOfVisibleDices: null, //spolu
    guess: null, //aktualna stavka
    players: null //ci hraju a pripadne ruka a visible ruka
};

function time() {
    var d = new Date(Date.now());
    var t = "[";
    t += (d.getHours()<10 ? "0" : "") + d.getHours() + ":";
    t += (d.getMinutes()<10 ? "0" : "") + d.getMinutes() + ":";
    t += (d.getSeconds()<10 ? "0" : "") + d.getSeconds() + "-";
    t += (d.getDate()<10 ? "0" : "") + d.getDate() + "/";
    t += (d.getMonth()<9 ? "0" : "") + (d.getMonth()+1) + "/";
    t += d.getFullYear();
    t += "] ";
    return t;
}

function makeState() {
    state.numOfPlayers = players.length;
    state.numOfDices = Game.count;
    state.numOfVisibleDices = 0;
    for (p of players) {
        state.numOfVisibleDices += p.visible;
    }
    state.guess = guess;
    state.players = new Array(players.length);
    for (var i=0; i<players.length; i++) {
        state.players[i] = {
            active: players[i].isActive(),
            dices: null,
            visibleDices: null
        };
        if (players[i].isActive()) {
            state.players[i].dices = players[i].getDices();
            state.players[i].visibleDices = players[i].visibleDices;
        }
    }
}

function printState() {
    makeState();
    var s = "{numOfPlayers: " + state.numOfPlayers + ", ";
    s += "numOfDices: " + state.numOfDices + ", ";
    s += "numOfVisibleDices: " + state.numOfVisibleDices + ", ";
    s += "guess: {count: " + state.guess.count + ", value: " + state.guess.value + "}, ";
    s += "players: [";
    for (var i=0; i<players.length-1; i++) {
        s += "{active: " + state.players[i].active;
        if (state.players[i].active) {
            s += ", dices: [";
            for (var j=0; j<state.players[i].dices.length-1; j++) {
                s += state.players[i].dices[j] + " ";
            }
            s += state.players[i].dices[state.players[i].dices.length-1] + "], ";
            s += "visibleDices: [";
            for (var j=0; j<state.players[i].visibleDices.length-1; j++) {
                if (state.players[i].visibleDices[j]!=0) {
                    s += state.players[i].visibleDices[j] + " ";
                }
            }
            if (state.players[i].visibleDices[state.players[i].visibleDices.length-1]!=0) {
                s += state.players[i].visibleDices[j] + " ";
            }
            s += "]";
        }
        s += "}, ";
    }
    s += "{active: " + state.players[players.length-1].active;
    if (state.players[players.length-1].active) {
        s += ", dices: [";
        for (var j=0; j<state.players[players.length-1].dices.length-1; j++) {
            s += state.players[players.length-1].dices[j] + " ";
        }
        s += state.players[players.length-1].dices[state.players[players.length-1].dices.length-1] + "], ";
        s += "visibleDices: [";
        for (var j=0; j<state.players[players.length-1].visibleDices.length-1; j++) {
            if (state.players[players.length-1].visibleDices[j]!=0) {
                s += state.players[players.length-1].visibleDices[j] + " ";
            }
        }
        if (state.players[players.length-1].visibleDices[state.players[players.length-1].visibleDices.length-1]!=0) {
            s += state.players[players.length-1].visibleDices[state.players[players.length-1].visibleDices.length-1] + " ";
        }
        s += "]";
    }
    s += "}";
    s += "]}"
    return s;
}

fs.writeFile("log.txt", "LOG" + "\n", (err) => {
    if (err) throw err;
});

fs.appendFile("log.txt", time() + "Server started" + "\n", (err) => {
    if (err) throw err;
});

io.on('connection', (socket)=>{
    numOfConnections.value++;
    clients.set(numOfConnections.value, socket);

    fs.appendFile("log.txt", time() + "Player " + numOfConnections.value + " connected, IP: " + ip[numOfConnections.value-1] + "\n", (err) => {
        if (err) throw err;
    });

    socket.emit('newMessage', {
        code: 0,
        value: numOfConnections.value
    });

    if (start && numOfConnections.value==n) {
        start = false;
        for (var i=1; i<=n; i++) {
            clients.get(i).emit('newMessage', {
                code: 1,
                value: { status: "OK", player: players[i-1] }
            });
            players[i-1].socket = clients.get(i);
            fs.appendFile("log.txt", time() + "Player " + i + " is playing" + "\n", (err) => {
                if (err) throw err;
            });
        }
    } else if (numOfConnections.value>n) {
        socket.emit('newMessage', {
            code: 1,
            value: "overLimit"
        });
        fs.appendFile("log.txt", time() + "Player " + numOfConnections.value + " is over limit" + "\n", (err) => {
            if (err) throw err;
        });
    }
    

    socket.on('createMessage', (newMessage)=>{
        console.log(newMessage);
        switch(newMessage.code) {
            case "start":
                n = newMessage.value.n;
                m = newMessage.value.m;
                fs.appendFile("log.txt", time() + "Number of players selected: " + n + ", number of dices selected: " + m + "\n", (err) => {
                    if (err) throw err;
                });
                players = Game.createGame(n, m);
                if (numOfConnections.value>=n) {
                    for (var i=1; i<=n; i++) {
                        clients.get(i).emit('newMessage', {
                            code: 1,
                            value: { status: "OK", player: players[i-1] }
                        });
                        players[i-1].socket = clients.get(i);
                        fs.appendFile("log.txt", time() + "Player " + i + " is playing" + "\n", (err) => {
                            if (err) throw err;
                        });
                    }
                    for (var i=n+1; i<=numOfConnections.value; i++) {
                        clients.get(i).emit('newMessage', {
                            code: 1,
                            value: { status: "overLimit" }
                        });
                        fs.appendFile("log.txt", time() + "Player " + i + " is over limit" + "\n", (err) => {
                            if (err) throw err;
                        });
                    }
                } else {
                    start = true;
                }
                break;
            case "player":
                connected++;
                if (connected==n) {
                    guess = new Guess(1,0);
                    fs.appendFile("log.txt", time() + "Game started, state: " + printState() + "\n", (err) => {
                        if (err) throw err;
                    });
                    Game.game(players);
                }
                break;
            case "answer":
                var num;
                var it = 0;
                clients.forEach((s)=> {
                    if (s==socket) {
                        num = it;
                    }
                    it++;
                });
                switch(newMessage.value.continue) {
                    case "wannaRoll":
                        if (newMessage.value.answer) {
                            socket.emit('newMessage', {
                                code: 4,
                                value: {
                                    message: "How many?",
                                    alert: "Sorry, you can't roll that many dices. Try again.",
                                    bigger: 0,
                                    smaller: players[num].getDices().length,
                                    continue: "send"
                                }
                            });
                        } else {
                            socket.emit('newMessage', {
                                code: 5,
                                value: "roll"
                            });
                            players[num].wannaRoll2(newMessage.value.answer);
                        }
                        break;
                    case "show":
                        if (newMessage.value.answer) {
                            socket.emit('newMessage', {
                                code: 4,
                                value: {
                                    message: "How many dices do you wanna show?",
                                    alert: "Sorry, you can't show that many dices. Try again.",
                                    bigger: -1,
                                    smaller: players[num].getDices().length-players[num].visible,
                                    continue: "show"
                                }
                            });
                        } else {
                            socket.emit('newMessage', {
                                code: 5,
                                value: "show"
                            });
                            socket.emit('newMessage', {
                                code: 2,
                                value: "OK, you don't have to."
                            });
                        }
                        break;
                    case "raiseOne":
                        if (newMessage.value.answer) {
                            socket.emit('newMessage', {
                                code: 4,
                                value: {
                                    message: "Value of dices:",
                                    alert: "",
                                    bigger: "neg",
                                    smaller: "pos",
                                    args: {n: newMessage.value.args, one: true},
                                    continue: "raise2"
                                }
                            });
                        } else {
                            socket.emit('newMessage', {
                                code: 4,
                                value: {
                                    message: "Number of dices:",
                                    alert: "",
                                    bigger: "neg",
                                    smaller: "pos",
                                    args: null,
                                    continue: "raise1"
                                }
                            });
                        }
                        break;
                    case "raiseTwo":
                        if (newMessage.value.answer) {
                            guess = new Guess(newMessage.value.args.n, newMessage.value.num);
                            fs.appendFile("log.txt", time() + "Player " + (num+1) + " guessed: {count: " + guess.count + ", value: " + guess.value + "}" + "\n", (err) => {
                                if (err) throw err;
                            });
                            socket.emit('newMessage', {
                                code: 5,
                                value: "raise"
                            });
                        } else {
                            socket.emit('newMessage', {
                                code: 4,
                                value: {
                                    message: "Value of dices:",
                                    alert: "",
                                    bigger: "neg",
                                    smaller: "pos",
                                    args: {n: newMessage.value.args.n, one: newMessage.value.args.one},
                                    continue: "raise2"
                                }
                            });
                        }
                        break;
                    case "play1":
                        if (newMessage.value.answer) {
                            if (Player.canRaise(guess, Game.count)) {
                                players[num].askShow();
                            } else {
                                socket.emit('newMessage', {
                                    code: 2,
                                    value: "Sorry, you can't raise because there are no more dices."
                                })
                                var output = "Do you really think there ";
                                if (guess.count==1) {
                                    output += "isn't " + guess.count + " dice ";
                                } else {
                                    output += "aren't " + guess.count + " dices ";
                                }
                                output += "with value " + guess.value + "? (yes/no)";
                                socket.emit('newMessage', {
                                    code: 3,
                                    value: {
                                        message: output,
                                        continue: "play2"
                                    }
                                });
                            }
                        } else {
                            var output = "Do you really think there ";
                            if (guess.count==1) {
                                output += "isn't " + guess.count + " dice ";
                            } else {
                                output += "aren't " + guess.count + " dices ";
                            }
                            output += "with value " + guess.value + "? (yes/no)";
                            socket.emit('newMessage', {
                                code: 3,
                                value: {
                                    message: output,
                                    continue: "play2"
                                }
                            });
                        }
                        break;
                    case "play2":
                        if (newMessage.value.answer) {
                            var count = { value: Game.count };
                            fs.appendFile("log.txt", time() + "Player " + (num+1) + " didn't raise at state: " + printState() + "\n", (err) => {
                                if (err) throw err;
                            });
                            players[num].stop(players, guess, Game.index, count);
                            Game.count = count.value;
                        } else {
                            socket.emit('newMessage', {
                                code:3,
                                value: {
                                    message: "Do you wanna raise? (yes/no)",
                                    continue: "play1",
                                    args: {}
                                }
                            });
                        }
                        break;
                }
                break;
            case "do":
                var num;
                var it = 0;
                clients.forEach((s)=> {
                    if (s==socket) {
                        num = it;
                    }
                    it++;
                });
                switch(newMessage.value.function) {
                    case "rollAtBeginning":
                        players[num].rollAtBeginning(newMessage.value.num);
                        if (newMessage.value.num==players[num].getDices().length) {
                            var hand = "[";
                            for (var i=0; i<players[num].getDices().length-1; i++) {
                                hand += players[num].dices[i] + " ";
                            }
                            hand += players[num].dices[players[num].dices.length-1] + "]";
                            fs.appendFile("log.txt", time() + "Player " + (num+1) + " rerolling dices, indices: {all}, hand: " + hand + "\n", (err) => {
                                if (err) throw err;
                            });
                        }
                        break;
                    case "addIndex":
                        if (!Player.addIndex(newMessage.value.num-1, newMessage.value.args.ind)) {
                            socket.emit('newMessage', {
                                code: 4,
                                value: {
                                    message: "You have already chosen that dice. Please enter another index. (1-" + players[num].dices.length + ")",
                                    alert: "Sorry, that's not a valid index. Try again.",
                                    bigger: 0,
                                    smaller: players[num].getDices().length,
                                    args: { ind: newMessage.value.args.ind, n: newMessage.value.args.n, use: newMessage.value.args.use },
                                    continue: "addIndex"
                                }
                            });
                        } else {
                            players[num].getIndices(newMessage.value.args.use, newMessage.value.args.n, null, newMessage.value.args.ind);
                            if (newMessage.value.args.n==0) {
                                var indices = "{";
                                var a = 0;
                                for (var i of newMessage.value.args.ind) {
                                    if (i) {
                                        a++;
                                    }
                                }
                                for (var i=0; i<newMessage.value.args.ind.length; i++) {
                                    if (newMessage.value.args.ind[i]) {
                                        indices += (i+1);
                                        a--;
                                        if (a!=0) {
                                            indices += ", ";
                                        }
                                    }
                                }
                                indices += "}";
                                var hand = "[";
                                for (var i=0; i<players[num].getDices().length-1; i++) {
                                    hand += players[num].dices[i] + " ";
                                }
                                hand += players[num].dices[players[num].dices.length-1] + "]";
                                if (newMessage.value.args.use=="roll") {
                                    fs.appendFile("log.txt", time() + "Player " + (num+1) + " rerolling dices, indices: " + indices + ", hand: " + hand + "\n", (err) => {
                                        if (err) throw err;
                                    });
                                } else {
                                    var visible = "[";
                                    a = 0;
                                    for (var v of players[num].visibleDices) {
                                        if (v!=0) {
                                            a++;
                                        }
                                    }
                                    for (var v of players[num].visibleDices) {
                                        if (v!=0) {
                                            visible += v;
                                            a--;
                                            if (a!=0) {
                                                visible += ", ";
                                            }
                                        }
                                    }
                                    visible += "]";
                                    fs.appendFile("log.txt", time() + "Player " + (num+1) + " showing dices, indices: " + indices + ", hand: " + hand + ", visible dices: " + visible + "\n", (err) => {
                                        if (err) throw err;
                                    });
                                }
                            }
                        }
                        break;
                    case "show":
                        players[num].showDices(newMessage.value.num);
                        break;
                    case "raise1":
                        switch(Player.validNumberRaise(guess, newMessage.value.num, Game.count)) {
                            case "count":
                                socket.emit('newMessage', {
                                    code: 4,
                                    value: {
                                        message: "Too much! Must be less than " + (Game.count+1) + ".",
                                        alert: "",
                                        bigger: "neg",
                                        smaller: "pos",
                                        args: null,
                                        continue: "raise1"
                                    }
                                });
                                break;
                            case "lessOnePossible":
                                socket.emit('newMessage', {
                                    code: 2,
                                    value: "Too little! Must be at least " + (2*guess.count) + " of any value or " + (guess.count+1) + " dices of value 1."
                                });
                                socket.emit('newMessage', {
                                    code: 3,
                                    value: {
                                        message: "So you can enter 1 as a value in the next step. Do you want to do that? (yes/no)",
                                        continue: "raiseOne",
                                        num: newMessage.value.num
                                    }
                                });
                                break;
                            case "lessOne":
                                socket.emit('newMessage', {
                                    code: 4,
                                    value: {
                                        message: "Too little! Must be at least " + (2*guess.count) + " of any value or " + (guess.count+1) + " dices of value 1.",
                                        alert: "",
                                        bigger: "neg",
                                        smaller: "pos",
                                        args: null,
                                        continue: "raise1"
                                    }
                                });
                                break;
                            case "lessPossible":
                                socket.emit('newMessage', {
                                    code: 2,
                                    value: "Too little! Must be at least " + guess.count + " of any value or " + Math.floor(guess.count/2+1) + " dices of value 1."
                                });
                                socket.emit('newMessage', {
                                    code: 3,
                                    value: {
                                        message: "So you can enter 1 as a value in the next step. Do you want to do that? (yes/no)",
                                        continue: "raiseOne",
                                        num: newMessage.value.num
                                    }
                                });
                                break;
                            case "less":
                                socket.emit('newMessage', {
                                    code: 4,
                                    value: {
                                        message: "Too little! Must be at least " + guess.count + " of any value or " + Math.floor(guess.count/2+1) + " dices of value 1.",
                                        alert: "",
                                        bigger: "neg",
                                        smaller: "pos",
                                        args: null,
                                        continue: "raise1"
                                    }
                                });
                                break;
                            case "valid":
                                socket.emit('newMessage', {
                                    code: 4,
                                    value: {
                                        message: "Value of dices:",
                                        alert: "",
                                        bigger: "neg",
                                        smaller: "pos",
                                        args: {n: newMessage.value.num, one: false},
                                        continue: "raise2"
                                    }
                                });
                                break;
                        }
                        break;
                    case "raise2":
                        switch(Player.validValueRaise(guess, newMessage.value.args.n, newMessage.value.num, newMessage.value.args.one)) {
                            case "range":
                                socket.emit('newMessage', {
                                    code: 4,
                                    value: {
                                        message: "How could that be on a dice? Try again.",
                                        alert: "",
                                        bigger: "neg",
                                        smaller: "pos",
                                        args: {n: newMessage.value.args.n, one: newMessage.value.args.one},
                                        continue: "raise2"
                                    }
                                });
                                break;
                            case "one":
                                socket.emit('newMessage', {
                                    code: 4,
                                    value: {
                                        message: "You promised to enter value 1, remember? Try again.",
                                        alert: "",
                                        bigger: "neg",
                                        smaller: "pos",
                                        args: {n: newMessage.value.args.n, one: newMessage.value.args.one},
                                        continue: "raise2"
                                    }
                                });
                                break;
                            case "noRaise":
                                socket.emit('newMessage', {
                                    code: 2,
                                    value: "You didn't raise the number, therefore you have to raise the value."
                                });
                                socket.emit('newMessage', {
                                    code: 3,
                                    value: {
                                        message: "Do you want to change the number? (yes/no)",
                                        continue: "raiseTwo",
                                        num: newMessage.value.num
                                    }
                                });
                                break;
                            case "valid":
                                guess = new Guess(newMessage.value.args.n, newMessage.value.num);
                                fs.appendFile("log.txt", time() + "Player " + (num+1) + " guessed: {count: " + guess.count + ", value: " + guess.value + "}" + "\n", (err) => {
                                    if (err) throw err;
                                });
                                socket.emit('newMessage', {
                                    code: 5,
                                    value: "raise"
                                });
                                break;
                        }
                        break;
                }
                break;
            case "update":
                switch(newMessage.value) {
                    case "roll":
                        var playing = 0;
                        for (pl of players) {
                            if (pl.isActive()) {
                                playing++;
                            }
                        }
                        updated++;
                        if (updated==playing) {
                            updated = 0;
                            fs.appendFile("log.txt", time() + "New round, state: " + printState() + "\n", (err) => {
                                if (err) throw err;
                            });
                            makeState();
                            var fields = 'numOfPlayers,numOfDices,numOfVisibleDices,guess,players(active,visibleDices)';
                            var i = 0;
                            clients.forEach((s) => {
                                var visibleState = {
                                    visible: mask(state, fields),
                                    dices: state.players[i].dices
                                };
                                s.emit('newMessage', {
                                    code: 6,
                                    value: visibleState
                                });
                                i++;
                            });
                            Game.newGame2(players, clients);
                        }
                        break;
                    case "show":
                        var num;
                        var it = 0;
                        clients.forEach((s)=> {
                            if (s==socket) {
                                num = it;
                            }
                            it++;
                        });
                        players[num].raise();
                        break;
                    case "raise":
                        makeState();
                        var fields = 'numOfPlayers,numOfDices,numOfVisibleDices,guess,players(active,visibleDices)';
                        var i = 0;
                        clients.forEach((s) => {
                            var visibleState = {
                                visible: mask(state, fields),
                                dices: state.players[i].dices
                            };
                            s.emit('newMessage', {
                                code: 6,
                                value: visibleState
                            });
                            i++;
                        });
                        Game.nextTurn(players, guess);
                        break;
                    case "play":
                        guess = new Guess(1,0);
                        fs.appendFile("log.txt", time() + "New round, state: " + printState() + "\n", (err) => {
                            if (err) throw err;
                        });
                        Game.nextTurn(players, guess);
                        break;
                }
                break;
        }
    });
    

    socket.on('disconnect', ()=>{
        clients.delete(socket);
        numOfConnections.value--;
        fs.appendFile("log.txt", time() + "Player disconnected, unable to continue" + "\n", (err) => {
            if (err) throw err;
        });
    });
  });


app.use('/public', express.static(__dirname + "/public"));

app.get("/", (request, response) => { //pripojenie
    if (numOfConnections.value==0) {
        response.sendFile("projekt.html", {root: __dirname + "/public"});
    } else {
        response.sendFile("game.html", {root: __dirname + "/public"});
    }
    ip[numOfConnections.value] = request.ip;    
});


server.listen(port, (err) => {
    if (err) {
        return console.log("Something unexpected has happened ", err);
    }
});