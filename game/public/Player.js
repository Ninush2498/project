let Guess = null;
if (typeof module !== "undefined") {
    Guess = require("./Guess");
}

class Player {
    
    constructor(number) {
        this.socket = null;
        this.dices = new Array(number);
        for (var i=0; i<number; i++) {
            this.dices[i] = Math.floor(Math.random()*6)+1;
        }
        this.active = true;
        this.visibleDices = new Array(number);
        for (var i=0; i<number; i++) {
            this.visibleDices[i] = 0;
        }
        this.visible = 0;
    }

    getDices() {
        return this.dices;
    }
    
    isActive() {
        return this.active;
    }
    
    roll1() {
        for (var i=0; i<this.dices.length; i++) {
            this.dices[i] = Math.floor(Math.random()*6)+1;
        }
    }
    
    roll2(indices) {
        for (var i=0; i<this.dices.length; i++) {
            if (indices[i]) {
                this.dices[i] = Math.floor(Math.random()*6)+1;
            }
        }
        this.socket.emit('newMessage', {
            code: 5,
            value: "roll"
        });
    }
    
    static addIndex(index, indices) {
        console.log(index);
        console.log(indices);
        if (!indices[index]) {
            indices[index] = true;
            return true;
        } else {
            return false;
        }
    }
    
    makeIndices(actual) {
        var indices = new Array(this.dices.length).fill();
        if (actual!=null) {
            for (var i=0; i<actual.length; i++) {
                if (actual[i]!=0) {
                    indices[i] = true;
                } else {
                    indices[i] = false;
                }
            }
        }
        return indices;
    }
    
    getIndices(use, n, actual, ind) {
        var indices;
        if (ind==null) {
            indices = this.makeIndices(actual);
        } else {
            indices = ind;
        }
        if (n!=0) {
            var self = this;
            var m;
            if(use=="show") {
                m = "Click the dice you wanna show.";
            } else {
                m = "Click the dice you wanna roll again.";
            }
            var player = this;
            this.socket.emit('newMessage', {
                code: 2,
                value: m
            })
            this.socket.emit('newMessage', {
                code: 7,
                value: {
                    dices: player.dices,
                    visibleDices: player.visibleDices,
                    args: { ind: indices, n: n-1, use: use }
                }
            });
        } else {
            if(use=="show") {
                this.show(indices);
            } else {
                this.roll2(indices);
            }
        }
    }
    
    rollAtBeginning(n) {
        if (n==this.dices.length) {
            this.roll1();
            this.socket.emit('newMessage', {
                code: 5,
                value: "roll"
            });
        } else {
            this.getIndices("roll", n, null, null);
        }
    }
    
    wannaRoll() {
        this.socket.emit('newMessage', {
            code: 3,
            value: {
                message: "Wanna roll any of your dices before the game?",
                continue: "wannaRoll"
            }
        });
    }
    
    static validNumberRaise(last, n, count) {
        if(n>count) {
            return "count";
        } else if (last.value==1) {
            if (n<2*last.count){
                if (n>=last.count+1) {
                    return "lessOnePossible";
                } else {
                    return "lessOne";
                }
            } else {
                return "valid";
            }
        } else {
            if (n<last.count) {
                if (n>last.count/2) {
                    return "lessPossible";
                } else {
                    return "less";
                }
            } else {
                return "valid";
            }
        }
    }
    
    static validValueRaise(last, n, v, one) {
        if(v>6 || v<1) {
            return "range";
        } else if (one && v!=1) {
            return "one";
        } else if (n==last.count && v<=last.value && v!=1){
            return "noRaise";
        } else {
            return "valid";
        }
    }
    
    raise() {
        this.socket.emit('newMessage', {
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
    
    static total(p, guess) {
        var values = new Array(6).fill(0);
        for(var x of p) {
            if (x.isActive()) {
                for (var d of x.getDices()) {
                    values[d-1]++;
                }
            }
        }
        if (guess.value!=1) {
            return values[guess.value-1]+values[0];
        } else {
            return values[0];
        }
    }
    
    result(guess, p, index, total, count) {
              
        for (var x of p) {
            if (x.isActive()) {
                x.roll1();
                x.visibleDices = new Array(x.getDices().length).fill(0);
                x.visible = 0;
            }
        }

        var right;        
        if (total<guess.count) {
            if (Player.prevPlayer(p, index).getDices().length<guess.count-total) {
                Player.prevPlayer(p, index).loseDice(Player.prevPlayer(p, index).getDices().length);
                count.value = count.value-(Player.prevPlayer(p, index).getDices().length);
            } else {
                Player.prevPlayer(p, index).loseDice(guess.count-total);
                count.value = count.value-(guess.count-total);
            }
            right = "right";
        } else if (total>guess.count) {
            if (this.getDices().length<total-guess.count) {
                this.loseDice(this.getDices().length);
                count.value = count.value-(this.getDices().length);
            } else {
                this.loseDice(total-guess.count);
                count.value = count.value-(total-guess.count);
            }
            right = "wrong";
        } else {
            this.loseDice(1);
            Player.prevPlayer(p, index).gainDice();
            right = "wrong";
        }        
        if (total>1) {
            return (right + ">");
        } else if (total==1){
            return (right + "=");
        } else {
            return (right + "<");
        }        
    }
    
    stop(p, guess, index, count) {
        var total = Player.total(p, guess);
        var res = this.result(guess, p, index, total, count);
        var equal = res.slice(5, 6);
        switch(res) {
            case "right>":
            case "right<":
            case "right=":
                this.socket.emit('newMessage', {
                    code: 2,
                    value: "You were right!"
                });
                break;
            case "wrong>":
            case "wrong<":
            case "wrong=":
                this.socket.emit('newMessage', {
                    code: 2,
                    value: "You were wrong!"
                });
                break;
        }
        var output = "";
        switch(equal) {
            case '>':
                output += " There were " + total + " dices";
                break;
            case '=':
                output += " There was 1 dice";
                break;
            case '<':
                output += " There were no dices";
                break;
        }
        output += " with value " + guess.value + ".";
        this.socket.emit('newMessage', {
            code: 2,
            value: output
        });
        this.socket.emit('newMessage', {
            code: 5,
            value: "play"
        });
    }
    
    loseDice(number) {
        if (this.getDices().length>number) { 
            var newDices = new Array();
            for (var i=0; i<this.dices.length-number; i++) {
                newDices[i] = this.dices[i];
            }
            this.dices = newDices;     
        } else {
            this.gameOver();
        }
    }
    
    gainDice() {
        var newDices = new Array();
        for (var i=0; i<this.dices.length; i++) {
            newDices[i] = this.dices[i];
        }
        newDices[this.dices.length] = Math.floor(Math.random()*6)+1;
        this.dices = newDices;
    }
    
    static canRaise(guess, count) {
        if (guess.count<=count && (guess.value!=1 || guess.count<count)) {
            return true;
        }
        return false;
    }
    
    show(indices) {
        var vis = new Array(this.dices.length).fill(0);
        if (indices==null) {
            for (var i=0; i<this.dices.length; i++) {
                vis[i] = this.dices[i];
            }
            this.visible = this.dices.length;
        } else {
            this.visible = 0;
            for (var i=0; i<this.dices.length; i++) {
                if (indices[i]) {
                    vis[i] = this.dices[i];
                    this.visible++;
                } else {
                    this.dices[i] = Math.floor(Math.random()*6)+1;
                }
            }
        }
        this.visibleDices = vis;
        this.socket.emit('newMessage', {
            code: 5,
            value: "show"
        });
    }
    
    showDices(n) {
        if (n+this.visible==this.dices.length) {
            this.show(null);
        } else {
            if (n!=0) {
                this.getIndices("show", n, this.visibleDices, null);
            } else {
                this.socket.emit('newMessage', {
                    code: 5,
                    value: "show"
                });
            }
        }
    }
    
    askShow() {
        this.socket.emit('newMessage', {
            code: 3,
            value: {
                message: "Do you wanna show some dices and roll the rest?",
                continue: "show"
            }
        });
    }
    
    play(p, guess) {
        this.socket.emit('newMessage', {
            code:3,
            value: {
                message: "Do you wanna raise?",
                continue: "play1",
                args: {}
            }
        });
    }
    
    static prevPlayer(p, index) {
        while(true) {
            if (index==0) {
                index = p.length;
            }
            if (!p[index-1].isActive()) {
                index--;
            } else {
                return p[index-1];
            }   
        }           
    }
    
    gameOver() {
        this.active = false;
        this.socket.emit('newMessage', {
            code: 2,
            value: "Game over :("
        });
    }
    
    win() {
        this.socket.emit('newMessage', {
            code: 2,
            value: "Congratulations, you won!"
        });
    }
    
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = Player;
}
