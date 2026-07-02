//  Genious: newbie/good01.c
//  Written by Hannah on 10/92

#include "Newbie.h"
#define  BFLY  NEWBIE + "Mon/butterfly"

object butterfly1, butterfly2, butterfly3;


void extra_create()
{
    set( "short", "Road To Rainbow Village" );
    set( "day_long",
        "This is a lovely road that leads to that happy place, " +
        "Rainbow Village.  Your heart feels joyous and happy, and the " +
        "sun seems to smile down at you.  Everything feels good in " +
        "the world today." );
    set( "day_light", SUNLIGHT );
    set( "night_light", SUNLIGHT );

    set( "exits", ([ "east": "crossroads",
                     "west": "good02" ]) );

    set( "descs", ([
      "road":
        "It's a lovely road, isn't it?",
      "sun":
        "You shouldn't be looking at the sun.  That's bad for your eyes." ]) );
}


void extra_reset()
{
    if( !butterfly1 )
    {
        butterfly1 = clone_object( BFLY );
        butterfly1->set_short( "a yellow butterfly" );
        butterfly1->add_alias( "yellow butterfly" );
        move_object( butterfly1, THISO );
    }
    if( !butterfly2 )
    {
        butterfly2 = clone_object( BFLY );
        butterfly2->set_short( "an orange butterfly" );
        butterfly2->add_alias( "orange butterfly" );
        move_object( butterfly2, THISO );
    }
    if( !butterfly3 )
    {
        butterfly3 = clone_object( BFLY );
        butterfly3->set_short( "a pink butterfly" );
        butterfly3->add_alias( "pink butterfly" );
        move_object( butterfly3, THISO );
    }
}
