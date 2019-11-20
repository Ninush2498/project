/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package game;

import java.util.Random;

/**
 *
 * @author Nina
 */
public class Player {
    
    private int[] dices;
    public int[] visibleDices;
    private boolean active;
    private Random r;
    public int visible;
    
    public Player(int number) {
        r = new Random();
        dices = new int[number];
        for (int i=0; i<number; i++) {
            dices[i] = r.nextInt(6)+1;
        }
        active = true;
        visibleDices = new int[number];
        for (int a : visibleDices) {
            a = 0;
        }
        visible = 0;
    }
    
    public int[] getDices() {
        return dices;
    }
    
    public boolean isActive() {
        return active;
    }
    
    public void roll() {
        for (int i=0; i<dices.length; i++) {
            dices[i] = r.nextInt(6)+1;
        }
    }
    
    public void roll(boolean[] indices) {
        for (int i=0; i<dices.length; i++) {
            if (indices[i]) {
                dices[i] = r.nextInt(6)+1;
            }
        }
    }
    
    public static boolean addIndex(int index, boolean[] indices) {
        if (!indices[index]) {
            indices[index] = true;
            return true;
        } else {
            return false;
        }
    }
    
    public boolean[] makeIndices(int[] actual) {
        boolean[] indices = new boolean[dices.length];
        if (actual!=null) {
            for (int i=0; i<actual.length; i++) {
                if (actual[i]!=0) {
                    indices[i] = true;
                } else {
                    indices[i] = false;
                }
            }
        }
        return indices;
    }
    
    public boolean[] getIndices(int n, int[] actual) {
        boolean[] indices = makeIndices(actual);
        for (int i=0; i<n; i++) {
            System.out.println("Enter the index of the " + (i+1) + ". dice. (1-" + dices.length + ")");
            int m = Game.nextInteger();
            if (!valid(m)) {
                System.out.println("Sorry, " + n + " is not a valid index. Try again.");
                i--;
            } else {
                if (!addIndex(m-1, indices)) {
                    System.out.println("You have already chosen that dice. Please enter another index.");
                    i--;
                }
            }
        }
        return indices;
    }
    
    public void rollAtBeginning(int n) {
        if (n==dices.length) {
            this.roll();
        } else {
            this.roll(this.getIndices(n, null)); //je jedno
        }
    }
    
    public void wannaRoll(int index) {
        System.out.println("Player " + (index));
        System.out.println("Your dices:");
        for (int d : this.getDices()) {
            System.out.print(d + " ");
        }
        System.out.println();
        
        System.out.println("Wanna roll any of your dices before the game? (true/false)");
        if (Game.nextBoolean()) {
            System.out.println("How many?");
            int n;
            while(true) {
                n = Game.nextInteger();
                if (!valid(n)) {
                    System.out.println("Sorry, you can't roll " + n + " dices. Try again.");
                } else {
                    this.rollAtBeginning(n);
                    break;
                }
            }
        } else {
            System.out.println("OK, you don't have to.");
        }
        
        System.out.println("Your dices:");
        for (int d : this.getDices()) {
            System.out.print(d + " ");
        }
        System.out.println();
    }
    
    public boolean valid(int n) {
        return (n>0 && n<=this.getDices().length);
    }
    
    public static String validNumberRaise(Guess last, int n) {
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
    
    public static String validValueRaise(Guess last, int n, int v, boolean one) {
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
    
    public Guess raise(Guess last) {
        int n = 0;
        int v = 0;
        boolean one = false;
        boolean isValid = false;
        
        while(!isValid) {
            System.out.println("Number of dices:");
            n = Game.nextInteger();
            switch(validNumberRaise(last, n)) {
                case "count":
                    System.out.println("Too much! Must be less than " + (Game.count+1) + ".");
                    break;
                case "lessOnePossible":
                    System.out.println("Too little! Must be at least " + (2*last.count()) + " of any value or " + (last.count()+1) + " dices of value 1.");
                    System.out.println("So you can enter 1 as a value in the next step. Do you want to do that? (true/false)");
                    if (Game.nextBoolean()) {
                        one = true;
                        isValid = true;
                    }
                    break;
                case "lessOne":
                    System.out.println("Too little! Must be at least " + (2*last.count()) + " of any value or " + (last.count()+1) + " dices of value 1.");
                    break;
                case "lessPossible":
                    System.out.println("Too little! Must be at least " + last.count() + " of any value or " + (last.count()/2+1) + " dices of value 1.");
                    System.out.println("So you can enter 1 as a value in the next step. Do you want to do that? (true/false)");
                    if (Game.nextBoolean()) {
                        one = true;
                        isValid = true;
                    }
                    break;
                case "less":
                    System.out.println("Too little! Must be at least " + last.count() + " of any value or " + (last.count()/2+1) + " dices of value 1.");
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
            switch(validValueRaise(last, n, v, one)) {
                case "range":
                    System.out.println("How could that be on a dice? Try again.");
                    break;
                case "one":
                    System.out.println("You promised to enter value 1, remember? Try again.");
                    break;
                case "noRaise":
                    System.out.println("You didn't raise the number, therefore you have to raise the value.");
                    System.out.println("Do you want to change the number? (true/false)");
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
    
    public static int total(Player[] p, Guess guess) {
        int[] values = new int[6];
        for(Player x : p) {
            if (x.isActive()) {
                for (int d : x.getDices()) {
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
    
    public String result(Guess guess, Player[] p, int index, int total) {
              
        for (Player x : p) {
            if (x.isActive()) {
                x.roll();
                x.visibleDices = new int[x.getDices().length];
                x.visible = 0;
            }
        }
        String right;
        
        if (total<guess.count()) {
            prevPlayer(p, index).loseDice(2);
            Game.count = Game.count-2;
            right = "right";
        } else if (total>guess.count()) {
            this.loseDice(2);
            Game.count = Game.count-2;
            right = "wrong";
        } else {
            this.loseDice(1);
            prevPlayer(p, index).gainDice();
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
    
    public void stop(Player[] p, Guess guess, int index) {
        int total = total(p, guess);
        String res = this.result(guess, p, index, total);
        char equal = res.charAt(5);
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
        System.out.println(" with value " + guess.value() + "."); //zratane aj s jednotkami
        
    }
    
    public void loseDice(int number) {
        if (this.getDices().length>number) { 
            int[] newDices = new int[dices.length-number];
            for (int i=0; i<dices.length-number; i++) {
                newDices[i] = dices[i];
            }
            dices = newDices;        
        } else {
            this.gameOver();
        }
    }
    
    public void gainDice() {
        int[] newDices = new int[dices.length+1];
        for (int i=0; i<dices.length; i++) {
            newDices[i] = dices[i];
        }
        newDices[dices.length] = r.nextInt(6)+1;
        dices = newDices;
    }
    
    public static boolean canRaise(Guess guess) {
        if (guess.count()<=Game.count && (guess.value()!=1 || guess.count()<Game.count)) {
            return true;
        }
        return false;
    }
    
    public void show(boolean[] indices) {
        int[] vis;
        if (indices==null) {
            vis = new int[dices.length];
            for (int i=0; i<dices.length; i++) {
                vis[i] = dices[i];
            }
            visible = dices.length;
        } else {
            visible = 0;
            vis = new int[dices.length];
            for (int i=0; i<dices.length; i++) {
                if (indices[i]) {
                    vis[i] = dices[i];
                    visible++;
                } else {
                    dices[i] = r.nextInt(6)+1;
                }
            }
        }
        visibleDices = vis;
    }
    
    public void showDices(int n) {
        if (n+visible==dices.length) {
            this.show(null);
        } else {
            this.show(this.getIndices(n, visibleDices));
        }
    }
    
    public void askShow() {
        System.out.println("Do you wanna show some dices and roll the rest? (true/false)");
        if (Game.nextBoolean()) {
            System.out.println("How many dices do you wanna show?");
            int n;
            while(true) {
                n = Game.nextInteger();
                if (!valid(n+visible)) {
                    System.out.println("Sorry, you can't show " + n + " dices. Try again.");
                } else {
                    this.showDices(n);
                    System.out.println("Your dices:");
                    for (int d : this.getDices()) {
                        System.out.print(d + " ");
                    }
                    System.out.println();
                    break;
                }
            }
        } else {
            System.out.println("OK, you don't have to.");
        }
    }
    
    public Guess play(Player[] p, Guess guess, int index) {
        System.out.println("Player " + (index+1));
        
        while(true) {
            System.out.println("Last guess: " + guess.count() + " " + guess.value());
            System.out.println("Your dices:");
            for (int d : this.getDices()) {
                System.out.print(d + " ");
            }
            System.out.println();
            System.out.println("Visible dices of other players:");
            for (Player pl : p) {
                if (pl!=this) {
                    for (int d : pl.visibleDices) {
                        if (d!=0) {
                            System.out.print(d + " ");
                        }
                    }
                }
            }
            System.out.println();
            System.out.println("Do you wanna raise? (true/false)");
            if(Game.nextBoolean()) {
                if (canRaise(guess)) {
                    this.askShow();
                    return this.raise(guess);
                } else {
                    System.out.println("Sorry, you can't raise because there are no more dices.");
                }
            }
            System.out.print("Do you really think there ");
            if (guess.count()==1) {
                System.out.print("isn't " + guess.count() + " dice ");
            } else {
                System.out.print("aren't " + guess.count() + " dices ");
            }
            System.out.println("with value " + guess.value() + "? (true/false)");
            if (Game.nextBoolean()) {
                this.stop(p, guess, index);
                return new Guess(1,0);
            }
        }
    }
    
    public static Player prevPlayer(Player[] p, int index) {
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
    
    public void gameOver() {
        active = false;
        System.out.println("Game over :(");
    }
    
    public void win() {
        System.out.println("Congratulations, you won!");
    }
    
}
