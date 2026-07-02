//  Genious: newbie/evil15.c
//  Written by Hannah on 12/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "The Gates of Hell" );
    set( "day_long",
      "Cries of lament and screams of pain fill the air.  A huge pair of "+
      "black gates rise up before you, and a line of condemned souls "+
      "waiting to enter stretches back as far as the eye can see.  Red-hot "+
      "coals and glowing embers light up the gaunt faces." );
    set( "day_light", DIM );

    set( "exits", ([ "west": "evil14" ]) );

    set( "descs", ([
      ({ "gates", "black gates" }):
        "These are the Gates of Hell!\n"+
        "You wail in despair.",
      ({ "line", "souls", "condemned souls" }):
        "This is definitely a line in which you don't want to end up.",
      ({ "coals", "coal" }):
        "Some of the coals appear to be a bit loose.",
      ({ "embers", "glowing embers" }):
        "The embers look small enough to pick up."
    ]) );
    set( UndergroundP, 1 );
    set( InsideP, 1 );
}


void extra_init()
{
    add_action( "do_search", "search" );
}


status do_search( string str )
{
    if( str != "coals" && str != "coal" && str != "embers" )
        return( 0 );
    THISP->add_hp( -5 );
    say( sprintf( "%s burns %s hands on some hot %s!\n",
      PNAME, possessive( THISP ), str ) );
    return( printf( "Ouch!  You burn your hands on some hot %s!\n", str ), 1 );
}


status query_enter_ok()
{
    if( THISP->query_alignment() > DEVILISH_AL )
       return( printf( "You hear the laughing of demons as you attempt to "+
         "enter their domain.\n\n" ), 1 );
    return( 0 );
}
