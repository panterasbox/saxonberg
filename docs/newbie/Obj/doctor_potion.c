//  Genious: Obj/doctor_potion.c
//  Written by Hannah
//  This potion is limited; see good07.c.

inherit HealingCode;

#define SWIGS  5


void setup_next_use()
{
    set( "heal_hp", 5 + random( 5 ) );     // avg = 7
    set( "heal_mana", 5 + random( 5 ) );   // avg = 7
    set( "heal_ftg", 10 + random( 10 ) );  // avg = 14.5
}


status heal( string str )
{
    set( "action_msg", ({
      "You take a swig from the jar of potion.  You feel a little better.",
      PNAME + " takes a swig from " + possessive( THISP ) +
        " jar of healing potion." }) );
    set( "last_use_msg",
      "The jar is now empty, so you toss it in the nearest recycling bin." );
    set( "value", ( query( "heal_uses" ) ?
      query( "value" ) - ( query( "value" ) / query( "heal_uses" ) ) : 0 ) );
    return( do_heal( str ) );
}


status query_doctor_potion()
{
    return( 1 );
}


void extra_create()
{
    set( "id", ({ "potion", "healing potion", "jar" }) );
    set( "short", "a jar of healing potion" );
    set( "long", "This is a small jar of healing potion." );
    set( "value", 1500 );    //  (7*10 + 7*10 + 14.5*5) * 5 * 2 = 2125
    set( "weight", 50 );
    setup_next_use();
    set( "heal_uses", SWIGS );
    set( "heal_action", "drink" );
    set( "solid", 0 );   // liquid
}
