/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package game;

import java.util.Scanner;
import javafx.util.Pair;

/**
 *
 * @author Nina
 */
public class Player {
    
    private Dice[] dices;
    private boolean active;
    
    public Player(int number) {
        dices = new Dice[number];
        for (int i=0; i<number; i++) {
            dices[i] = new Dice();
        }
        active = true;
    }
    
    public Dice[] getDices() {
        return dices;
    }
    
    public boolean isActive() {
        return active;
    }
    
    public void roll() {
        for (Dice d : dices) {
            d.roll();
        }
    }
    
    public Pair<Integer, Integer> raise(Pair<Integer, Integer> last) {
        Scanner s = new Scanner(System.in);
        int n = 0;
        int v = 0;
        boolean one = false;
        boolean done = false;
        
        while (!done) {
            while(true) {
                System.out.println("Number of dices:");
                n = s.nextInt();
                if(n>Game.count) {
                    System.out.println("Too much! Must be less than " + (Game.count+1) + ".");
                } else if (last.getValue()==1) {
                    if (n<2*last.getKey()){
                        System.out.println("Too little! Must be at least " + (2*last.getKey()) + " of any value or " + (last.getKey()+1) + " dices of value 1.");
                        if (n>=last.getKey()+1) {
                            System.out.println("So you can enter 1 as a value in the next step. Do you want to do that? (true/false)");
                            if (s.nextBoolean()) {
                                one = true;
                                break;
                            }
                        }
                    } else {
                        break;
                    }
                } else {
                    if (n<last.getKey()) {
                        System.out.println("Too little! Must be at least " + last.getKey() + " of any value or " + (last.getKey()/2+1) + " dices of value 1.");
                        if (n>last.getKey()/2) {
                            System.out.println("So you can enter 1 as a value in the next step. Do you want to do that? (true/false)");
                            if (s.nextBoolean()) {
                                one = true;
                                break;
                            }
                        }
                    } else {
                        break;
                    }
                }
            }
            while(true) {
                System.out.println("Value of dices:");
                v = s.nextInt();
                if(v>6 || v<1) {
                    System.out.println("How could that be on a dice? Try again.");
                } else if (one && v!=1) {
                    System.out.println("You promised to enter value 1, remember? Try again.");
                } else if (n==last.getKey() && v<=last.getValue() && v!=1){
                    System.out.println("You didn't raise the number, therefore you have to raise the value.");
                    System.out.println("Do you want to change the number? (true/false)");
                    if (s.nextBoolean()) {
                        break;
                    }
                } else {
                    done = true;
                    break;
                }
            }
        }
        return new Pair<Integer, Integer>(n,v);
    }
    
    public void stop(Player[] p, Pair<Integer, Integer> guess, int index) {
        int[] values = new int[6];
        for(Player x : p) {
            if (x.isActive()) {
                for (Dice d : x.getDices()) {
                    values[d.getValue()-1]++;
                }
            }
        }
        int total;
        if (guess.getValue()!=1) {
            total = values[guess.getValue()-1]+values[0];
        } else {
            total = values[0];
        }
        
        if (total<guess.getKey()) {
            prevPlayer(p, index).loseDice(2);
            Game.count = Game.count-2;
            System.out.print("You were right!");
        } else if (total>guess.getKey()) {
            this.loseDice(2);
            Game.count = Game.count-2;
            System.out.print("You were wrong!");
        } else {
            this.loseDice(1);
            prevPlayer(p, index).gainDice();
            System.out.print("You were wrong!");
        }        
        if (total>1) {
            System.out.print(" There were " + total + " dices");
        } else if (total==1){
            System.out.print(" There was 1 dice");
        } else {
            System.out.print(" There were no dices");
        }
        System.out.println(" with value " + guess.getValue() + "."); //zratane aj s jednotkami
        
        for (Player x : p) {
            if (x.isActive()) {
                x.roll();
            }
        }
    }
    
    public void loseDice(int number) {
        if (this.getDices().length>number) { 
            Dice[] newDices = new Dice[dices.length-number];
            for (int i=0; i<dices.length-number; i++) {
                newDices[i] = dices[i];
            }
            dices = newDices;        
        } else {
            this.gameOver();
        }
    }
    
    public void gainDice() {
        Dice[] newDices = new Dice[dices.length+1];
        for (int i=0; i<dices.length; i++) {
            newDices[i] = dices[i];
        }
        newDices[dices.length] = new Dice();
        dices = newDices;
    }
    
    public Pair<Integer, Integer> play(Player[] p, Pair<Integer, Integer> guess, int index) {
        Scanner s = new Scanner(System.in);
        
        while(true) {
            System.out.println("Last guess: " + guess.getKey() + " " + guess.getValue());
            System.out.println("Your dices:");
            for (Dice d : this.getDices()) {
                System.out.print(d.getValue() + " ");
            }
            System.out.println();
            System.out.println("Do you wanna raise? (true/false)");
            if(s.nextBoolean()) {
                if (guess.getKey()<=Game.count && (guess.getValue()!=1 || guess.getKey()<Game.count)) {
                    return this.raise(guess);
                } else {
                    System.out.println("Sorry, you can't raise because there are no more dices.");
                }
            }
            System.out.print("Do you really think there ");
            if (guess.getKey()==1) {
                System.out.print("isn't " + guess.getKey() + " dice ");
            } else {
                System.out.print("aren't " + guess.getKey() + " dices ");
            }
            System.out.println("with value " + guess.getValue() + "? (true/false)");
            if (s.nextBoolean()) {
                this.stop(p, guess, index);
                return new Pair<Integer, Integer>(1,0);
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
