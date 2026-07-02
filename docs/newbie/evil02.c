//  Genious: newbie/evil02.c
//  Written by Hannah on 11/92

#include "Newbie.h"
#define  LEECH  NEWBIE + "Mon/leech"
#define  NFROG   NEWBIE + "Obj/frog"

object leech1, leech2;
int     SetupFrog = 1;


void extra_create()
{
    set( "short", "Putrid Stream" );
    set( "day_long",
      "Slimy brown water sloshes all over you, and the smell makes " +
      "you feel queasy.  The mists make it difficult for you to see " +
      "around you.  You see a rock poking out of the water.  There " +
      "are dry places to step up to towards the north and east, and " +
      "a slimy bank to the southwest." );
    set( "day_light", DIM );
    set( "night_light", DIM );
 
    set( "exits", ([
        "north":     "evil05",
        "east":      "evil03",
        "southwest": "evil01" ]) );

    set( "descs", ([
        ({ "stream", "water" }):
            "It is such a miserable stream, isn't it?",
        "mists":
            "The mists make it hard to see.",
        "rock":
            "The rock looks a little loose.",
        ({ "bank", "slimy bank" }):
            "It looks a little drier there." ]) );
}


void extra_reset()
{
    SetupFrog = 1;
    CloneIt( LEECH, leech1 );
    CloneIt( LEECH, leech2 );
}


int search( string str )
{
    if( !str || str != "rock" )
       return( 0 );
    if( !SetupFrog )
    {
        say( sprintf( "%s searches underneath a rock and finds nothing.\n",
          PNAME ) );
        return( printf( "You search the rock, but don't find anything.\n" ),
          1 );
    }
    SetupFrog = 0;
    move_object( clone_object( NFROG ), THISO );
    say( PNAME + " searches the rock, and uncovers a little frog.\n" );
    return( printf(
        "You search the rock, and find a little frog underneath.\n" ), 1 );
}
