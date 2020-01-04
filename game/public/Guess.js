module.exports = class Guess {
    
    constructor(c, v) {
        this.count = c;
        this.value = v;
    }
    
    value() {
        return this.value;
    }
    
    count() {
        return this.count;
    }
    
}
