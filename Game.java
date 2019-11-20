/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package game;

import java.util.Scanner;

/**
 *
 * @author Nina
 */
public class Game {
    
    static int index = -1;
    static int count = 0;
    
    public static boolean nextBoolean() {
        Scanner s = new Scanner(System.in);
        return s.nextBoolean();
    }
    
    public static int nextInteger() {
        Scanner s = new Scanner(System.in);
        return s.nextInt();
    }
    
    public static Guess nextTurn(Player[] p, Guess guess) {
        if (guess.count()==1 && guess.value()==0) {
            return newGame(p, guess);
        } else {
            if (index<p.length-1) {
                index++;
            } else {
                index = 0;
            }
            if (p[index].isActive()) {
                return p[index].play(p, guess, index);
            } else {
                return guess;
            }
        }
    }
    
    public static void winnerPrinter(int winner, Player[] p) {
        System.out.println("Player " + (winner)); 
        p[winner-1].win();
    }
    
    public static void newRoundPrinter(Player[] p) {
        System.out.println("New round");     
        System.out.println("Player " + (index+1));
        System.out.println("Your dices:");
        for (int d : p[index].getDices()) {
            System.out.print(d + " ");
        }
        System.out.println();
    }
    
    public static Guess newGame(Player[] p, Guess guess) { //pozmenit
        int playing = 0;
        int winner = -1;
        for (int i=0; i<p.length; i++) {
            if (p[i].isActive()) {
                playing++;
                winner = i;
            }            
        }
        
        if (index==-1) {
            int i = 1;
            for (Player pl : p) {
                pl.wannaRoll(i);
                i++;
            }
        }
        
        if (playing<2) {
            winnerPrinter(winner+1, p);
            return new Guess(0,0);
        } else {
            if (index<p.length-1) {
                index++;
            } else {
                index = 0;
            }
            newRoundPrinter(p);
            p[index].askShow();
            return p[index].raise(guess);
        }
    }
    
    public static Player[] createGame(int n, int m) {
        Player[] players = new Player[n];        
        for (int i=0; i<n; i++) {
            players[i] = new Player(m);
            count += m;
        }
        return players;
    }
    
    public static void game(Player[] players, Guess guess) {
        guess = newGame(players, guess);
        while(true) {
            guess = nextTurn(players, guess);
            if (guess.count()==0) {
                break;
            }
        }        
    }
    

    /**
     * @param args the command line arguments
     */
    public static void main(String[] args) {
        // TODO code application logic here
        int n, m;
        
        System.out.println("Enter the number of players:");
        while(true) {
            n = nextInteger();
            if (n<2) {
                System.out.println("At least 2 players are required. Please try again.");
            } else {
                break;
            }
        }
        
        System.out.println("Enter the number of dices:");
        while(true) {
            m = nextInteger();
            if (m<1) {
                System.out.println("You need at least 1 dice to play. Please try again.");
            } else {
                break;
            }
        }
        
        System.out.println("Game starts");
        game(createGame(n, m), new Guess(1,0));
        System.out.println("Game ends");
    }
    
}
