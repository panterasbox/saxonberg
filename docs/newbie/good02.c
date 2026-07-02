//  Genious: newbie/good02.c
//  Written by Hannah on 10/92

#include "Newbie.h"
#define  BUNNY  NEWBIE + "Mon/bunny"

object bunnyr1, bunnyr2, bunnyr3, bunnyr4;
int     RollNum = 0;


void extra_create()
{
    set( "short", "Bend in the Road" );
    set( "day_long",
        "You have reached a bend in the lovely road.  The grass on the " +
        "side of the road looks so inviting, you feel an urge to roll " +
        "around in it.  The road heads north towards Rainbow village, " +
        "and heads east towards the entrance gates." );
    set( "day_light", SUNLIGHT );
    set( "night_light", SUNLIGHT );

    set( "exits", ([ "north": "good04",
                     "east":  "good01",
                     "west":  "good03" ]) );

    set( "descs", ([
      "road":  "You see nothing special about the road.",
      "grass": "Why don't you roll in it?" ]) );
}


void extra_reset()
{
    RollNum = 0;
    CloneIt( BUNNY, bunnyr1 );
    CloneIt( BUNNY, bunnyr2 );
    CloneIt( BUNNY, bunnyr3 );
    CloneIt( BUNNY, bunnyr4 );
}


void extra_init()
{
    add_action( "do_roll", "roll" );
}


//  Command:  "roll" or "roll around" or "roll in grass"
//
int do_roll( string str )
{
    notify_fail(  "Roll around in what?\n"  );
    if ( !str || ( str != "around" && str != "in grass" ) )
        return( 0 );
    say( PNAME + " rolls around in the grass.\n" );
    write( "You roll around in the grass.\n" );
    if( ( RollNum == 2 ) && !present( "bunnypoop" ) ) {
        say( capitalize( subjective( THISP ) ) +
          "%s squishes on something gross!\n" );
        write( "You squish on something gross!\n" );
        move_object( clone_object( NEWBIE + "Obj/bpoop" ), THISO );
    }
    if( RollNum < 2 )
        RollNum++;
    return( 1 );
}
