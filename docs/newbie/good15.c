//  Genious: newbie/good15.c
//  Written by Hannah on 12/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "The Gates Of Heaven" );
    set( "day_long",
      "Before you stand gigantic gates that appear to be made of some kind "+
      "of pearly substance.  In front of the gates is a line of souls that "+
      "seems to stretch back for miles.  There is harp music playing "+
      "serenely in the background.  A very bright light emanates from "+
      "behind the gates." );
    set( "day_light", SUNLIGHT );
    set( "exits", ([
      "south" : "good14"
    ]) );
    set( "descs", ([
      ({ "gates", "pearly gates", "gigantic gates", "gate" }):
          "The pearly gates look huge and imposing.",
      "line":
          "As far as you try to see, you just can't seem to be able to find "+
          "the end of the line.",
      ({ "souls", "soul" }):
          "The souls in line stand quietly and make little movement.  They "+
          "do not appear to notice your presence.",
      ({ "light", "bright light" }):
          "It's bright!  You cannot bear to look at it, even for just a "+
          "second.",
    ]) );
    set( OutsideP, 1 );
}


void extra_init()
{
    add_action( "do_enter", "enter" );
}


status do_enter( string str )
{
    if( !str || str != "gates" )
        return( 0 );
    say( sprintf( "%s tries to enter the Pearly Gates.\n", PNAME ) );
    write( "You try to enter the Pearly Gates.\n" );
    tell_room( THISO,
      "A booming voice says: Please, no line cutting.  Thank you.\n" );
    return( 1 );
}


status query_enter_ok()
{
    if( THISP->query_alignment() < SAINTLY_AL )
        return(
          printf( "You are not worthy enough to rise to the heavens.\n" ), 1 );
    return( 0 );
}
