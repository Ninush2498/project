# Projekt JavaScript verzia

### Instalacia:

(poziadavky: Node JS)  
cd game  
npm install --save-dev utf-8-validate  
npm install --save-dev bufferutil  
npm install
 
### Spustenie:

node http_server.js  
otvorit http://localhost:3000, zvolit pocet hracov a kociek pre hraca  
pripojit sa zvolenym poctom hracov

## Pravidla

Na zaciatku hry ma kazdy hrac rovnaky pocet kociek a cielom hry je ostat ako posledny v hre. Hrac vypadava, ked strati vsetky svoje kocky.  
Na zaciatku kola si kazdy hrac hodi vsetky svoje kocky, pricom jednotlivi hraci nevedia, co maju na kockach ostatni.  
Zacinajuci hrac spravi odhad, povie pocet a cislo, na kolkych kockach dokopy u vsetkych hracov dane cislo padlo. Potom nasleduje tah dalsieho hraca, pricom ten sa moze rozhodnut, ci predoslemu odhadu veri (v tom pripade ho musi navysit) alebo neveri (vtedy prichadza k vyhodnoteniu). Kolo pokracuje, az kym sa jeden z hracov nerozhodne neverit.  
Ak hrac veri, musi navysit aspon jednu z casti odhadu, bud pocet (teda povedat, ze na stole je viac kociek daneho cisla), alebo cislo (teda ze daneho poctu je tam aj kociek s vyssou hodnotou). Ak sa rozhodne navysovat, tesne predtym ma moznost odkryt hodnoty na niektorych zo svojich kociek a zvysne kocky si hodit este raz.  
Ak hrac neveri, odkryju sa vsetky kocky a overi sa odhad. Ak nebol hodeny uvedeny pocet kociek (teda odhad bol chybny), straca hrac, ktory dany odhad urobil, tolko kociek, kolko je rozdiel medzi odhadom a skutocnym poctom. Ak bol odhad spravny (teda bolo dokopy hodenych viac kociek daneho cisla), straca hrac, ktory sa rozhodol neverit, tolko kociek, kolko je rozdiel medzi skutocnym poctom a odhadom. Ak bol hodeny presne odhadovany pocet, hrac, ktory neveril, straca jednu kocku, ktoru ziskava hrac, ktory dany odhad urobil.  
Po vyhodnoteni nasleduje dalsie kolo.  
Specialne postavenie v hre maju kocky s hodnotou 1. Pri vyhodnoteni sa rataju za aktualne odhadovane cislo a odhad s jednotkami ma dvojnasobnu hodnotu, teda napriklad odhad 3 dvojky sa da navysit odhadom 2 jednotky a naopak, na navysenie odhadu 4 jednotky je potrebne povedat az 8 kociek lubovolnej inej hodnoty.
