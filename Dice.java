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
public class Dice {
    
    private Random r;
    private int value;
    
    public Dice() {
        r = new Random();
        value = r.nextInt(6)+1;
    }
    
    public int getValue() {
        return value;
    }
    
    public void roll() {
        value = r.nextInt(6)+1;
    }
    
}
