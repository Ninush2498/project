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
public class Game {
    
    static int index = -1;
    static int count = 0;
    
    public static Pair<Integer, Integer> nextTurn(Player[] p, Pair<Integer, Integer> guess) {
        if (guess.getKey()==1 && guess.getValue()==0) {
            return newGame(p, guess);
        } else {
            if (index<p.length-1) {
                index++;
            } else {
                index = 0;
            }
            if (p[index].isActive()) {
                System.out.println("Player " + (index+1));
                return p[index].play(p, guess, index);
            } else {
                return guess;
            }
        }
    }
    
    public static Pair<Integer, Integer> newGame(Player[] p, Pair<Integer, Integer> guess) {
        int playing = 0;
        int winner = -1;
        for (int i=0; i<p.length; i++) {
            if (p[i].isActive()) {
                playing++;
                winner = i;
            }            
        }
        
        if (playing<2) {
            System.out.println("Player " + (winner+1));
            p[winner].win();
            return new Pair(0,0);
        } else {
            System.out.println("New round");
            if (index<p.length-1) {
                index++;
            } else {
                index = 0;
            }
            System.out.println("Player " + (index+1));
            System.out.println("Your dices:");
            for (Dice d : p[index].getDices()) {
                System.out.print(d.getValue() + " ");
            }
            System.out.println();
            return p[index].raise(guess);
        }
    }
    

    /**
     * @param args the command line arguments
     */
    public static void main(String[] args) {
        // TODO code application logic here
        Scanner s = new Scanner(System.in);
        Player[] players;
        Pair<Integer, Integer> guess = new Pair(1,0);
        int n, m;
        
        System.out.println("Enter the number of players:");
        while(true) {
            n = s.nextInt();
            if (n<2) {
                System.out.println("At least 2 players are required. Please try again.");
            } else {
                break;
            }
        }
        
        System.out.println("Enter the number of dices:");
        while(true) {
            m = s.nextInt();
            if (m<1) {
                System.out.println("You need at least 1 dice to play. Please try again.");
            } else {
                break;
            }
        }
        
        players = new Player[n];        
        for (int i=0; i<n; i++) {
            players[i] = new Player(m);
            count += m;
        }
        
        System.out.println("Game starts");
        guess = newGame(players, guess);
        while(true) {
            guess = nextTurn(players, guess);
            if (guess.getKey()==0) {
                break;
            }
        }
        System.out.println("Game ends");
    }
    
}
