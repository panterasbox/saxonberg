//  Genious: newbie/evil01.c
//  Written by Hannah on 10/92

#include "Newbie.h"
#define  SLIME  NEWBIE + "Mon/slime"

object slime1, slime2, slime3;


void extra_create()
{
    set( "short", "Slimy Road" );
    set( "day_long",
      "This is a dreary little road that seems to lead to nowhere.  " +
      "The grey clouds choke out all of the sunlight, and you shiver in " +
      "the cold.  The ground is covered with dead, rotting vegetation, " +
      "which feels a bit slippery underfoot.  You suddenly feel a " +
      "sense of dread." );
    set( "day_light", DIM );
    set( "night_light", DIM );

    set( "exits", ([ "west":      "crossroads",
                     "northeast": "evil02" ]) );
 
    set( "descs", ([
        "road":
            "It is such a miserable road, isn't it?",
        "ground":
            "The ground looks slimy and gross.",
        ({ "vegetation", "rotting vegetation" }):
            "The vegetation is rotting and smells awful." ]) );
}


void extra_reset()
{
    if( !slime1 )
    {
        slime1 = clone_object( SLIME );
        slime1->set( "short", "gray slime" );
        slime1->add_alias( "gray slime" );
        move_object( slime1, THISO );
    }
    if( !slime2 )
    {
        slime2 = clone_object( SLIME );
        slime2->set( "short", "green slime" );
        slime2->add_alias( "green slime" );
        move_object( slime2, THISO );
    }
    if( !slime3 )
    {
        slime3 = clone_object( SLIME );
        slime3->set( "short", "black slime" );
        slime3->add_alias( "black slime" );
        move_object( slime3, THISO );
    }
}
