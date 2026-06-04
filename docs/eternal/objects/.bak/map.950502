/* map.c */
/* before ??? */
/* updated 040193 by Raistlin */
/* updated again by Akula 021894 */
 
 
inherit ObjectCode;
 
extra_create()
{
    set( "id", ({ "map", "map of Eternal City" }) );
    set( "short", "a map of Eternal City" );
    set( "value", 0 );
    set( "weight", 1 );
    set( "long",
"                        A MAP OF ETERNAL CITY\n"+
"    ?                             Roads                Points of Interest\n"+
"    |                             =====                ==================\n"+
" SH-t-t-t-t-e SL    PCA         a: Dark Alley         *: Heart of E.C.\n"+
"    |       | |      |          d: Dimension Drive  AAC: A&A Clothiers\n"+
"    t-BS BB-e-s-s-s--s--s--o-?  e: Eternal Way       AG: Adventurer's G.H.\n"+
"    |       |     |        |    g: Glass Way         AI: Anarchy Interdim.\n"+
"    t       e  AI-l   ? EI-o    i: Infinity Way      BB: Bed & Breakfast\n"+
"    |       |     |   |    |    l: Limbo Lane        BG: Bard's Guild\n"+
" AG-t  AAC  e     l-a-a-a  o-?  o: Old Road          BS: Dr.F's Body Shop\n"+
"    |   |   |     |     |  |    s: Silver Street    DTR: Dave's Throne Room\n"+
"  ?-l-l-l-l-*-l-l-l  EB-a  o-V  t: Tanelorn Road     EB: Eight Ball\n"+
"    | |   | |   |       |  |    ?: city exit         EI: Everything Inc.\n"+
"   TA g  LI e   i WG    a  o                         FU: FU-Union-Lounge\n"+
"      |     |   | |     |  |                        LIB: E.C. Library\n"+
"      g-e-e-e   i-o--o--o--o                          O: Oracle\n"+
"      |     |   |       |                           PCA: Paranoid C&A\n"+
"      g-TE  FU  i       a                            SH: Sivar's Hall\n"+
"      |         |       |                            SL: Eternal S&L\n"+
"      g     TW  i-a--a--a                            TA: Temple of the Ages\n"+
"      |     |   |                                    TE: Temple of Eternity\n"+
"   BG-g-d-d-d-d-i-?                                  TW: Tower of Wizardry\n"+
"      |   |     |                                    WG: Warrior Guild\n"+
"      ?   O    DTR                                    V: Videopolis\n"+
"");
 
    set( "read", long() );
}
 
drop()
{
    if( this_verb()=="give" || this_verb()=="put" ) return 0;
   write("As you drop the map, it suddenly catches flame and is consumed.\n");
   say("As " +PNAME+ " drops a map, it bursts into flames and is consumed.\n");
 
   destruct(THISO);
   return 0;
}
 
