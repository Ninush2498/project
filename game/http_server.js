const express = require("express");
const socket = require("socket.io");
const app = express();
//const app = require("https-localhost")();
const http = require("http");
const server = http.createServer(app);
const io = socket(server);
const fs = require("fs");
const mask = require("json-mask");
const axios = require("axios");
const res = require("dotenv").config();

if (res.error) {
    throw res.error;
}

const port = process.env.PORT;
var env = { HOST: process.env.HOST, PORT: process.env.PORT, APP_ID: process.env.APP_ID };

var numOfConnections = {value: 0};
var gameCount = 0;
var activeGames = 0;

let clients = new Map();
let games = new Array();
const Game = require("./public/Game");
const Guess = require("./public/Guess");
var Player = require("./public/Player");
var ip = new Array();
var state = {
    numOfPlayers: null,
    numOfDices: null, //spolu
    numOfVisibleDices: null, //spolu
    index: null, //ktory hrac je na rade
    guess: null, //aktualna stavka
    players: null //ci hraju a pripadne ruka a visible ruka
};

let leaderboard = new Array(10);
var leader = {
    name: "- - - -",
    score: "-",
    realScore: 0
};
for (var i=0; i<10; i++) {
    leaderboard[i] = leader;
}

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

function makeState(index) {
    var players = games[index].players;
    state.numOfPlayers = players.length;
    state.numOfDices = games[index].count;
    state.numOfVisibleDices = 0;
    state.index = games[index].index;
    for (p of players) {
        state.numOfVisibleDices += p.visible;
    }
    state.guess = games[index].guess;
    state.guesses = games[index].guesses;
    state.players = new Array(players.length);
    for (var i=0; i<players.length; i++) {
        state.players[i] = {
            name: games[index].names[i],
            active: players[i].isActive(),
            dices: new Array(0),
            numOfDices: 0,
            visibleDices: new Array(0)
        };
        if (players[i].isActive()) {
            state.players[i].dices = players[i].getDices();
            state.players[i].numOfDices = state.players[i].dices.length;
            state.players[i].visibleDices = players[i].visibleDices;
        }
    }
}

function printState(index) {
    makeState(index);
    var s = "{numOfPlayers: " + state.numOfPlayers + ", ";
    s += "numOfDices: " + state.numOfDices + ", ";
    s += "numOfVisibleDices: " + state.numOfVisibleDices + ", ";
    s += "guess: {count: " + state.guess.count + ", value: " + state.guess.value + "}, ";
    s += "players: [";
    for (var i=0; i<state.players.length-1; i++) {
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
    s += "{active: " + state.players[state.players.length-1].active;
    if (state.players[state.players.length-1].active) {
        s += ", dices: [";
        for (var j=0; j<state.players[state.players.length-1].dices.length-1; j++) {
            s += state.players[state.players.length-1].dices[j] + " ";
        }
        s += state.players[state.players.length-1].dices[state.players[state.players.length-1].dices.length-1] + "], ";
        s += "visibleDices: [";
        for (var j=0; j<state.players[state.players.length-1].visibleDices.length-1; j++) {
            if (state.players[state.players.length-1].visibleDices[j]!=0) {
                s += state.players[state.players.length-1].visibleDices[j] + " ";
            }
        }
        if (state.players[state.players.length-1].visibleDices[state.players[state.players.length-1].visibleDices.length-1]!=0) {
            s += state.players[state.players.length-1].visibleDices[state.players[state.players.length-1].visibleDices.length-1] + " ";
        }
        s += "]";
    }
    s += "}";
    s += "]}"
    return s;
}

async function getAccessTokenFromCode(code) {
    var redirect;
    if (process.env.HOST == "localhost") {
        redirect = process.env.HOST + ":" + process.env.PORT + "/newGame";
    } else {
        redirect = process.env.HOST + "/newGame";
    }
    const { data } = await axios({
        url: 'https://graph.facebook.com/v7.0/oauth/access_token',
        method: 'get',
        params: {
            client_id: process.env.APP_ID,
            client_secret: process.env.APP_SECRET,
            redirect_uri: redirect,
            code,
        },
    });
    console.log(data); // { access_token, token_type, expires_in }
    return data.access_token;
};

async function getFacebookUserData(accesstoken) {
    const { data } = await axios({
        url: 'https://graph.facebook.com/me',
        method: 'get',
        params: {
            fields: ['id', 'first_name', 'picture'].join(','),
            access_token: accesstoken,
        },
    });
    console.log(data); // { id, first_name, picture }
    return data;
};

fs.appendFile("log.txt", "LOG" + "\n", (err) => {
    if (err) throw err;
});

fs.appendFile("log.txt", time() + "Server started" + "\n", (err) => {
    if (err) throw err;
});

io.on('connection', (socket)=>{

    socket.emit('newMessage', {
        code: 0,
        value: { env: env, leaderboard: leaderboard }
    });
    

    socket.on('createMessage', (newMessage)=>{
        console.log(newMessage);
        switch(newMessage.code) {
            case "access":
                numOfConnections.value++;
                fs.appendFile("log.txt", time() + "Player #" + numOfConnections.value + " connected, IP: " + ip[numOfConnections.value-1] + "\n", (err) => {
                    if (err) throw err;
                });
                //var token = getAccessTokenFromCode(newMessage.value);
                //getFacebookUserData(token);
                break;
            case "start":
                games[gameCount] = {
                    players: null,
                    names: null,
                    guesses: null,
                    count: 0,
                    guess: null,
                    index: -1,
                    connected: 1,
                    updated: 0,
                    ended: false,
                    newTurn: false,
                    clients: Array()
                }
                var n = newMessage.value.n;
                var m = newMessage.value.m;
                fs.appendFile("log.txt", time() + "Game #" + gameCount + "; Number of players selected: " + n + ", number of dices selected: " + m + "\n", (err) => {
                    if (err) throw err;
                });
                games[gameCount].players = Game.createGame(n, m);
                games[gameCount].names = Array(n);
                games[gameCount].guesses = Array(n);
                games[gameCount].count = n*m;
                games[gameCount].clients[0] = socket;
                games[gameCount].names[0] = newMessage.value.name;
                games[gameCount].guesses[0] = new Guess("-", "-");
                clients.set(socket, gameCount);
                gameCount++;
                break;
            case "join":
                var game = activeGames;
                if (typeof games[game] !== "undefined" && !games[game].players[0].isActive() && games[game].players.length==2) {
                    game++;
                    activeGames++;
                }
                if (typeof games[game] === "undefined") {
                    socket.emit('newMessage', {
                        code: 1,
                        value: { status: "overLimit" }
                    });
                } else {
                    games[game].clients[games[game].connected] = socket;
                    games[game].names[games[game].connected] = newMessage.value;
                    games[game].guesses[games[game].connected] = new Guess("-", "-");
                    clients.set(socket, game);
                    games[game].connected++;
                    if (games[game].connected==games[game].players.length) {
                        games[game].guess = new Guess(1,0);
                        for (var i=0; i<games[game].connected; i++) {
                            makeState(game);
                            var fields = 'numOfPlayers,numOfDices,numOfVisibleDices,index,guess,guesses,players(active,visibleDices,numOfDices,name)';
                            if (games[game].players[i].isActive()) {
                                var visibleState = {
                                    visible: mask(state, fields),
                                    dices: state.players[i].dices
                                };
                            }
                            games[game].clients[i].emit('newMessage', {
                                code: 1,
                                value: { status: "OK", player: games[game].players[i], index: i, gameID: game, state: visibleState }
                            });
                            games[game].players[i].socket = games[game].clients[i];
                            fs.appendFile("log.txt", time() + "Game #" + game + "; Player " + i + " is playing" + "\n", (err) => {
                                if (err) throw err;
                            });
                        }
                        fs.appendFile("log.txt", time() + "Game #" + game + "; Game started, state: " + printState(game) + "\n", (err) => {
                            if (err) throw err;
                        });
                        activeGames++;
                        games[game].newTurn = true;
                        Game.game(games[game]);
                    }
                }
                break;
            case "answer":
                var num;
                var it = 0;
                games[newMessage.value.gameID].clients.forEach((s)=> {
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
                                    smaller: games[newMessage.value.gameID].players[num].getDices().length,
                                    continue: "send"
                                }
                            });
                        } else {
                            socket.emit('newMessage', {
                                code: 5,
                                value: "roll"
                            });
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
                                    smaller: games[newMessage.value.gameID].players[num].getDices().length-games[newMessage.value.gameID].players[num].visible,
                                    continue: "show"
                                }
                            });
                        } else {
                            socket.emit('newMessage', {
                                code: 5,
                                value: "show"
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
                            games[newMessage.value.gameID].players[num].raise();
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
                            if (Player.canRaise(games[newMessage.value.gameID].guess, games[newMessage.value.gameID].count)) {
                                games[newMessage.value.gameID].players[num].askShow();
                            } else {
                                socket.emit('newMessage', {
                                    code: 2,
                                    value: "Sorry, you can't raise because there are no more dices."
                                })
                                var output = "Do you really think there ";
                                if (games[newMessage.value.gameID].guess.count==1) {
                                    output += "isn't " + games[newMessage.value.gameID].guess.count + " dice ";
                                } else {
                                    output += "aren't " + games[newMessage.value.gameID].guess.count + " dices ";
                                }
                                output += "with value " + games[newMessage.value.gameID].guess.value + "?";
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
                            if (games[newMessage.value.gameID].guess.count==1) {
                                output += "isn't " + games[newMessage.value.gameID].guess.count + " dice ";
                            } else {
                                output += "aren't " + games[newMessage.value.gameID].guess.count + " dices ";
                            }
                            output += "with value " + games[newMessage.value.gameID].guess.value + "?";
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
                            var count = { value: games[newMessage.value.gameID].count };
                            fs.appendFile("log.txt", time() + "Game #" + newMessage.value.gameID + "; Player " + (num+1) + " didn't raise at state: " + printState(newMessage.value.gameID) + "\n", (err) => {
                                if (err) throw err;
                            });
                            games[newMessage.value.gameID].players[num].stop(games[newMessage.value.gameID].players, games[newMessage.value.gameID].guess, games[newMessage.value.gameID].index, count);
                            games[newMessage.value.gameID].count = count.value;
                        } else {
                            socket.emit('newMessage', {
                                code:3,
                                value: {
                                    message: "Do you wanna raise?",
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
                games[newMessage.value.gameID].clients.forEach((s)=> {
                    if (s==socket) {
                        num = it;
                    }
                    it++;
                });
                switch(newMessage.value.function) {
                    case "rollAtBeginning":
                        games[newMessage.value.gameID].players[num].rollAtBeginning(newMessage.value.num);
                        if (newMessage.value.num==games[newMessage.value.gameID].players[num].getDices().length) {
                            var hand = "[";
                            for (var i=0; i<games[newMessage.value.gameID].players[num].getDices().length-1; i++) {
                                hand += games[newMessage.value.gameID].players[num].dices[i] + " ";
                            }
                            hand += games[newMessage.value.gameID].players[num].dices[games[newMessage.value.gameID].players[num].dices.length-1] + "]";
                            fs.appendFile("log.txt", time() + "Game #" + newMessage.value.gameID + "; Player " + (num+1) + " rerolling dices, indices: {all}, hand: " + hand + "\n", (err) => {
                                if (err) throw err;
                            });
                        }
                        break;
                    case "addIndex":
                        if (!Player.addIndex(newMessage.value.num-1, newMessage.value.args.ind)) {
                            socket.emit('newMessage', {
                                code: 2,
                                value: "You have already chosen that dice. Please choose another."
                            })
                            socket.emit('newMessage', {
                                code: 7,
                                value: {
                                    dices: games[newMessage.value.gameID].players[num].dices,
                                    visibleDices: games[newMessage.value.gameID].players[num].visibleDices,
                                    args: newMessage.value.args
                                }
                            });
                        } else {
                            games[newMessage.value.gameID].players[num].getIndices(newMessage.value.args.use, newMessage.value.args.n, null, newMessage.value.args.ind);
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
                                for (var i=0; i<games[newMessage.value.gameID].players[num].getDices().length-1; i++) {
                                    hand += games[newMessage.value.gameID].players[num].dices[i] + " ";
                                }
                                hand += games[newMessage.value.gameID].players[num].dices[games[newMessage.value.gameID].players[num].dices.length-1] + "]";
                                if (newMessage.value.args.use=="roll") {
                                    fs.appendFile("log.txt", time() + "Game #" + newMessage.value.gameID + "; Player " + (num+1) + " rerolling dices, indices: " + indices + ", hand: " + hand + "\n", (err) => {
                                        if (err) throw err;
                                    });
                                } else {
                                    var visible = "[";
                                    a = 0;
                                    for (var v of games[newMessage.value.gameID].players[num].visibleDices) {
                                        if (v!=0) {
                                            a++;
                                        }
                                    }
                                    for (var v of games[newMessage.value.gameID].players[num].visibleDices) {
                                        if (v!=0) {
                                            visible += v;
                                            a--;
                                            if (a!=0) {
                                                visible += " ";
                                            }
                                        }
                                    }
                                    visible += "]";
                                    fs.appendFile("log.txt", time() + "Game #" + newMessage.value.gameID + "; Player " + (num+1) + " showing dices, indices: " + indices + ", hand: " + hand + ", visible dices: " + visible + "\n", (err) => {
                                        if (err) throw err;
                                    });
                                }
                            }
                        }
                        break;
                    case "show":
                        if (newMessage.value.num+games[newMessage.value.gameID].players[num].visible==games[newMessage.value.gameID].players[num].dices.length) {
                            var indices = "{all}";
                            var hand = "[";
                            for (var i=0; i<games[newMessage.value.gameID].players[num].getDices().length-1; i++) {
                                hand += games[newMessage.value.gameID].players[num].dices[i] + " ";
                            }
                            hand += games[newMessage.value.gameID].players[num].dices[games[newMessage.value.gameID].players[num].dices.length-1] + "]";
                            var visible = hand;
                            fs.appendFile("log.txt", time() + "Game #" + newMessage.value.gameID + "; Player " + (num+1) + " showing dices, indices: " + indices + ", hand: " + hand + ", visible dices: " + visible + "\n", (err) => {
                                if (err) throw err;
                            });
                        }
                        games[newMessage.value.gameID].players[num].showDices(newMessage.value.num);
                        break;
                    case "raise1":
                        switch(Player.validNumberRaise(games[newMessage.value.gameID].guess, newMessage.value.num, games[newMessage.value.gameID].count)) {
                            case "count":
                                socket.emit('newMessage', {
                                    code: 4,
                                    value: {
                                        message: "Too much! Must be less than " + (games[newMessage.value.gameID].count+1) + ".",
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
                                    value: "Too little! Must be at least " + (2*games[newMessage.value.gameID].guess.count) + " of any value or " + (games[newMessage.value.gameID].guess.count+1) + " dices of value 1."
                                });
                                socket.emit('newMessage', {
                                    code: 3,
                                    value: {
                                        message: "So you can enter 1 as a value in the next step. Do you want to do that?",
                                        continue: "raiseOne",
                                        num: newMessage.value.num
                                    }
                                });
                                break;
                            case "lessOne":
                                socket.emit('newMessage', {
                                    code: 4,
                                    value: {
                                        message: "Too little! Must be at least " + (2*games[newMessage.value.gameID].guess.count) + " of any value or " + (games[newMessage.value.gameID].guess.count+1) + " dices of value 1.",
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
                                    value: "Too little! Must be at least " + games[newMessage.value.gameID].guess.count + " of any value or " + Math.floor(games[newMessage.value.gameID].guess.count/2+1) + " dices of value 1."
                                });
                                socket.emit('newMessage', {
                                    code: 3,
                                    value: {
                                        message: "So you can enter 1 as a value in the next step. Do you want to do that?",
                                        continue: "raiseOne",
                                        num: newMessage.value.num
                                    }
                                });
                                break;
                            case "less":
                                socket.emit('newMessage', {
                                    code: 4,
                                    value: {
                                        message: "Too little! Must be at least " + games[newMessage.value.gameID].guess.count + " of any value or " + Math.floor(games[newMessage.value.gameID].guess.count/2+1) + " dices of value 1.",
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
                        switch(Player.validValueRaise(games[newMessage.value.gameID].guess, newMessage.value.args.n, newMessage.value.num, newMessage.value.args.one)) {
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
                                        message: "Do you want to change the number?",
                                        continue: "raiseTwo",
                                        num: newMessage.value.args
                                    }
                                });
                                break;
                            case "valid":
                                games[newMessage.value.gameID].guess = new Guess(newMessage.value.args.n, newMessage.value.num);
                                fs.appendFile("log.txt", time() + "Game #" + newMessage.value.gameID + "; Player " + (num+1) + " guessed: {count: " + games[newMessage.value.gameID].guess.count + ", value: " + games[newMessage.value.gameID].guess.value + "}, state: " + printState(newMessage.value.gameID) + "\n", (err) => {
                                    if (err) throw err;
                                });
                                socket.emit('newMessage', {
                                    code: 5,
                                    value: "raise"
                                });
                                var num;
                                var it = 0;
                                games[newMessage.value.gameID].clients.forEach((s)=> {
                                    if (s==socket) {
                                        num = it;
                                    }
                                    it++;
                                });
                                games[newMessage.value.gameID].guesses[num] = games[newMessage.value.gameID].guess;
                                break;
                        }
                        break;
                }
                break;
            case "update":
                switch(newMessage.value.value) {
                    case "roll":
                        var playing = 0;
                        for (pl of games[newMessage.value.gameID].players) {
                            if (pl.isActive()) {
                                playing++;
                            }
                        }
                        games[newMessage.value.gameID].updated++;
                        if (games[newMessage.value.gameID].updated==playing) {
                            games[newMessage.value.gameID].updated = 0;
                            games[newMessage.value.gameID].newTurn = false;
                            fs.appendFile("log.txt", time() + "Game #" + newMessage.value.gameID + "; New round, state: " + printState(newMessage.value.gameID) + "\n", (err) => {
                                if (err) throw err;
                            });
                            makeState(newMessage.value.gameID);
                            var fields = 'numOfPlayers,numOfDices,numOfVisibleDices,index,guess,guesses,players(active,visibleDices,numOfDices,name)';
                            var i = 0;
                            games[newMessage.value.gameID].clients.forEach((s) => {
                                if (games[newMessage.value.gameID].players[i].isActive()) {
                                    var visibleState = {
                                        visible: mask(state, fields),
                                        dices: state.players[i].dices
                                    };
                                    s.emit('newMessage', {
                                        code: 6,
                                        value: visibleState
                                    });
                                }
                                i++;
                            });
                            Game.newGame2(games[newMessage.value.gameID]);
                        }
                        break;
                    case "show":
                        var num;
                        var it = 0;
                        games[newMessage.value.gameID].clients.forEach((s)=> {
                            if (s==socket) {
                                num = it;
                            }
                            it++;
                        });
                        makeState(newMessage.value.gameID);
                        var fields = 'numOfPlayers,numOfDices,numOfVisibleDices,index,guess,guesses,players(active,visibleDices,numOfDices,name)';
                        var i = 0;
                        games[newMessage.value.gameID].clients.forEach((s) => {
                            if (games[newMessage.value.gameID].players[i].isActive()) {
                                var visibleState = {
                                    visible: mask(state, fields),
                                    dices: state.players[i].dices
                                };
                                visibleState.visible.index--;
                                s.emit('newMessage', {
                                    code: 6,
                                    value: visibleState
                                });
                            }
                            i++;
                        });
                        games[newMessage.value.gameID].players[num].raise();
                        break;
                    case "raise":
                        makeState(newMessage.value.gameID);
                        var fields = 'numOfPlayers,numOfDices,numOfVisibleDices,index,guess,guesses,players(active,visibleDices,numOfDices,name)';
                        var i = 0;
                        games[newMessage.value.gameID].clients.forEach((s) => {
                            if (games[newMessage.value.gameID].players[i].isActive()) {
                                var visibleState = {
                                    visible: mask(state, fields),
                                    dices: state.players[i].dices
                                };
                                s.emit('newMessage', {
                                    code: 6,
                                    value: visibleState
                                });
                            }
                            i++;
                        });
                        Game.nextTurn(games[newMessage.value.gameID]);
                        break;
                    case "play":
                        games[newMessage.value.gameID].guess = new Guess(1,0);
                        fs.appendFile("log.txt", time() + "Game #" + newMessage.value.gameID + "; New round, state: " + printState(newMessage.value.gameID) + "\n", (err) => {
                            if (err) throw err;
                        });
                        for (var i=0; i<games[newMessage.value.gameID].players.length; i++) {
                            games[newMessage.value.gameID].guesses[i] = new Guess("-", "-");
                        }
                        makeState(newMessage.value.gameID);
                            var fields = 'numOfPlayers,numOfDices,numOfVisibleDices,index,guess,guesses,players(active,visibleDices,numOfDices,name)';
                            var i = 0;
                            games[newMessage.value.gameID].clients.forEach((s) => {
                                if (games[newMessage.value.gameID].players[i].isActive()) {
                                    var visibleState = {
                                        visible: mask(state, fields),
                                        dices: state.players[i].dices
                                    };
                                    s.emit('newMessage', {
                                        code: 6,
                                        value: visibleState
                                    });
                                }
                                i++;
                            });
                        Game.nextTurn(games[newMessage.value.gameID]);
                        break;
                    case "leader":
                        var rank = -1;
                        for (var i=9; i>=0; i--) {
                            if (leaderboard[i].realScore<newMessage.value.args.player.length) {
                                rank = i;
                            } else {
                                break;
                            }
                        }
                        if (rank!=-1) {
                            var leader = {
                                name: newMessage.value.args.name,
                                score: newMessage.value.args.player.length,
                                realScore: newMessage.value.args.player.length
                            };
                            for (var i=8; i>=rank; i--) {
                                leaderboard[i+1] = leaderboard[i];
                            }
                            leaderboard[rank] = leader;
                        }
                        break;
                }
                break;
        }
    });
    

    socket.on('disconnect', ()=>{
        var index = clients.get(socket);
        if (typeof index !== "undefined") {
            var active = 0;
            var last;
            for (var i=0; i<games[index].clients.length; i++) {
                if (games[index].clients[i]==socket) {
                    games[index].players[i].active = false;
                    if (games[index].index==i && !games[index].ended) {
                        Game.nextTurn(games[index]);
                    }
                    fs.appendFile("log.txt", time() + "Player " + (i+1) + " from game #" + index + " disconnected" + "\n", (err) => {
                        if (err) throw err;
                    });
                }
                if (games[index].players[i].active) {
                    active++;
                    last = i;
                }
            }
            if (games[index].newTurn && !games[index].ended && games[index].updated==active) {
                games[index].updated = 0;
                games[index].newTurn = false;
                fs.appendFile("log.txt", time() + "Game #" + index + "; New round, state: " + printState(index) + "\n", (err) => {
                    if (err) throw err;
                });
                makeState(index);
                var fields = 'numOfPlayers,numOfDices,numOfVisibleDices,index,guess,guesses,players(active,visibleDices,numOfDices,name)';
                var i = 0;
                games[index].clients.forEach((s) => {
                    if (games[index].players[i].isActive()) {
                        var visibleState = {
                            visible: mask(state, fields),
                            dices: state.players[i].dices
                        };
                        s.emit('newMessage', {
                            code: 6,
                            value: visibleState
                        });
                    }
                    i++;
                });
                Game.newGame2(games[index]);
            }
            if (active==1) {
                games[index].ended = true;
            }
        }
        clients.delete(socket);
    });
  });


app.use('/public', express.static(__dirname + "/public"));

app.get("/", (request, response) => { //pripojenie
    response.sendFile("start.html", {root: __dirname + "/public"});
});

app.get("/pravidla", (request, response) => {
    response.sendFile("pravidla.html", {root: __dirname + "/public"});
});

app.get("/newGame", (request, response) => {
    response.sendFile("projekt.html", {root: __dirname + "/public"});
    ip[numOfConnections.value] = request.ip;
});

app.get("/joinGame", (request, response) => {
    response.sendFile("game.html", {root: __dirname + "/public"});
});

server.listen(port, (err) => {
    if (err) {
        return console.log("Something unexpected has happened ", err);
    }
});
