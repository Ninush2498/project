/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package game;

/**
 *
 * @author Nina
 */
public class Guess {
    
    private int count;
    private int value;
    
    public Guess(int c, int v) {
        count = c;
        value = v;
    }
    
    public int value() {
        return value;
    }
    
    public int count() {
        return count;
    }
    
}
