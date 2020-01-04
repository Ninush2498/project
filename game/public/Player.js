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
        this.wannaRoll2();
        this.socket.emit('newMessage', {
            code: 5,
            value: "roll"
        });
    }
    
    static addIndex(index, indices) {
        if (!indices[index]) {
            indices[index] = true;
            return true;
        } else {
            return false;
        }
    }
    
    makeIndices(actual) {
        var indices = new Array(6).fill();
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
                m = "Enter the index of the dice you wanna show. (1-" + self.dices.length + ")";
            } else {
                m = "Enter the index of the dice you wanna roll again. (1-" + self.dices.length + ")";
            }
            this.socket.emit('newMessage', {
                code: 4,
                value: {
                    message: m,
                    alert: "Sorry, that's not a valid index. Try again.",
                    bigger: 0,
                    smaller: self.getDices().length,
                    args: { ind: indices, n: n-1, use: use },
                    continue: "addIndex"
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
            this.wannaRoll2()
            this.socket.emit('newMessage', {
                code: 5,
                value: "roll"
            });
        } else {
            this.getIndices("roll", n, null, null);
        }
    }
    
    wannaRoll() {
        this.wannaRoll2();
        this.socket.emit('newMessage', {
            code: 3,
            value: {
                message: "Wanna roll any of your dices before the game? (yes/no)",
                continue: "wannaRoll"
            }
        });
    }

    wannaRoll2() {
        this.socket.emit('newMessage', {
            code: 2,
            value: "Your dices:"
        });
        var output = "";
        for (var d of this.getDices()) {
            output += d + " ";
        }
        this.socket.emit('newMessage', {
            code: 2,
            value: output
        });
    }
    
    static valid(n) { //NETREBA
        return (n>0 && n<=this.getDices().length);
    }
    
    static validNumberRaise(last, n) { //NIE
        if(n>Game.count) {
            return "count";
        } else if (last.value()==1) {
            if (n<2*last.count()){
                if (n>=last.count()+1) {
                    return "lessOnePossible";
                } else {
                    return "lessOne";
                }
            } else {
                return "valid";
            }
        } else {
            if (n<last.count()) {
                if (n>last.count()/2) {
                    return "lessPossible";
                } else {
                    return "less";
                }
            } else {
                return "valid";
            }
        }
    }
    
    static validValueRaise(last, n, v, one) { //NIE
        if(v>6 || v<1) {
            return "range";
        } else if (one && v!=1) {
            return "one";
        } else if (n==last.count() && v<=last.value() && v!=1){
            return "noRaise";
        } else {
            return "valid";
        }
    }
    
    raise(last) { //NIE (ale potialto ano)
        var n = 0;
        var v = 0;
        var one = false;
        var isValid = false;
        
        while(!isValid) {
            System.out.println("Number of dices:");
            n = Game.nextInteger();
            switch(Player.validNumberRaise(last, n)) {
                case "count":
                    alert("Too much! Must be less than " + (Game.count+1) + ".");
                    break;
                case "lessOnePossible":
                    alert("Too little! Must be at least " + (2*last.count()) + " of any value or " + (last.count()+1) + " dices of value 1.");
                    alert("So you can enter 1 as a value in the next step. Do you want to do that? (yes/no)");
                    if (Game.nextBoolean()) {
                        one = true;
                        isValid = true;
                    }
                    break;
                case "lessOne":
                    alert("Too little! Must be at least " + (2*last.count()) + " of any value or " + (last.count()+1) + " dices of value 1.");
                    break;
                case "lessPossible":
                    alert("Too little! Must be at least " + last.count() + " of any value or " + (last.count()/2+1) + " dices of value 1.");
                    alert("So you can enter 1 as a value in the next step. Do you want to do that? (yes/no)");
                    if (Game.nextBoolean()) {
                        one = true;
                        isValid = true;
                    }
                    break;
                case "less":
                    alert("Too little! Must be at least " + last.count() + " of any value or " + (last.count()/2+1) + " dices of value 1.");
                    break;
                case "valid":
                    isValid = true;
                    break;
            }
        }
        isValid = false;
        while(!isValid) {
            System.out.println("Value of dices:");
            v = Game.nextInteger();
            switch(player.validValueRaise(last, n, v, one)) {
                case "range":
                    alert("How could that be on a dice? Try again.");
                    break;
                case "one":
                    alert("You promised to enter value 1, remember? Try again.");
                    break;
                case "noRaise":
                    alert("You didn't raise the number, therefore you have to raise the value.");
                    System.out.println("Do you want to change the number? (yes/no)");
                    if (Game.nextBoolean()) {
                        isValid = true;
                    }
                    break;
                case "valid":
                    isValid = true;
                    break;
            }
        }
        return new Guess(n,v);
    }
    
    static total(p, guess) { //NIE
        var values = new Array(6).fill(0);
        for(var x in p) {
            if (x.isActive()) {
                for (var d in x.getDices()) {
                    values[d-1]++;
                }
            }
        }
        if (guess.value()!=1) {
            return values[guess.value()-1]+values[0];
        } else {
            return values[0];
        }
    }
    
    result(guess, p, index, total) { //NIE
              
        for (var x in p) {
            if (x.isActive()) {
                x.roll();
                x.visibleDices = new Array(x.getDices().length);
                x.visible = 0;
            }
        }

        var right;        
        if (total<guess.count()) {
            Player.prevPlayer(p, index).loseDice(2);
            Game.count = Game.count-2;
            right = "right";
        } else if (total>guess.count()) {
            this.loseDice(2);
            Game.count = Game.count-2;
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
    
    stop(p, guess, index) { //NIE
        var total = Player.total(p, guess);
        var res = this.result(guess, p, index, total);
        var equal = res.slice(5, 6);
        switch(res) {
            case "right>":
            case "right<":
            case "right=":
                System.out.print("You were right!");
                break;
            case "wrong>":
            case "wrong<":
            case "wrong=":
                System.out.print("You were wrong!");
                break;
        }
        switch(equal) {
            case '>':
                System.out.print(" There were " + total + " dices");
                break;
            case '=':
                System.out.print(" There was 1 dice");
                break;
            case '<':
                System.out.print(" There were no dices");
                break;
        }
        System.out.println(" with value " + guess.value() + ".");
        
    }
    
    loseDice(number) { //NIE
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
    
    gainDice() { //NIE
        var newDices = new Array();
        for (var i=0; i<this.dices.length; i++) {
            newDices[i] = this.dices[i];
        }
        newDices[this.dices.length] = Math.floor(Math.random()*6)+1;
        this.dices = newDices;
    }
    
    static canRaise(guess) { //NIE
        if (guess.count()<=Game.count && (guess.value()!=1 || guess.count()<Game.count)) {
            return true;
        }
        return false;
    }
    
    show(indices) {
        var vis = new Array();
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
        this.wannaRoll2();
        this.socket.emit('newMessage', {
            code: 5,
            value: "show"
        });
    }
    
    showDices(n) {
        if (n+this.visible==this.dices.length) {
            this.show(null);
        } else {
            this.getIndices("show", n, this.visibleDices, null);
        }
    }
    
    askShow() {
        this.socket.emit('newMessage', {
            code: 3,
            value: {
                message: "Do you wanna show some dices and roll the rest? (yes/no)",
                continue: "show"
            }
        });
    }
    
    play(p, guess, index) { //NIE
        System.out.println("Player " + (index+1));
        
        while(true) {
            System.out.println("Last guess: " + guess.count() + " " + guess.value());
            System.out.println("Your dices:");
            for (var d in this.getDices()) {
                System.out.print(d + " ");
            }
            System.out.println();
            System.out.println("Visible dices of other players:");
            for (var pl in p) {
                if (pl!=this) {
                    for (var d in pl.visibleDices) {
                        if (d!=0) {
                            System.out.print(d + " ");
                        }
                    }
                }
            }
            System.out.println();
            System.out.println("Do you wanna raise? (yes/no)");
            if(Game.nextBoolean()) {
                if (Player.canRaise(guess)) {
                    this.askShow();
                    return this.raise(guess);
                } else {
                    alert("Sorry, you can't raise because there are no more dices.");
                }
            }
            System.out.print("Do you really think there ");
            if (guess.count()==1) {
                System.out.print("isn't " + guess.count() + " dice ");
            } else {
                System.out.print("aren't " + guess.count() + " dices ");
            }
            System.out.println("with value " + guess.value() + "? (yes/no)");
            if (Game.nextBoolean()) {
                this.stop(p, guess, index);
                return new Guess(1,0);
            }
        }
    }
    
    static prevPlayer(p, index) { //NIE
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
    
    gameOver() { //NIE
        this.active = false;
        System.out.println("Game over :(");
    }
    
    win() { //NIE
        document.getElementById("paragraph").innerHTML += "Congratulations, you won!";
    }
    
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = Player;
}
