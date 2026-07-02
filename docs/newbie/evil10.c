//  Genious: newbie/evil10.c
//  Written by Hannah on 11/92

#include "Newbie.h"

void
extra_create()
{
    set( "short", "Ruins of an Old Pub" );
    set( "day_long",
      "This burnt-out shell of a building was once a social center of this "
      "city; nowadays all that remain are rotten wood and piles of bricks.  "
      "Near the back of the building is a stone stairwell leading down." );
    set( "day_light", DARK );
    set( "exits", ([
        "south": "evil09",
        "down":  "evil11"
      ]) );
    set( "descs", ([
        "building":
        "Black, grimy soot covers most of the walls, which look on the "
        "verge of collapsing.",
        ({ "wood", "rotten wood" }):
        "You see nothing special about the rotten wood.",
        ({ "bricks", "brick" }):
        "You see nothing special about the bricks.",
        "stairwell":
        "The stairwell is dark, and you are not sure that the steps "
        "will support your weight." ]) );
    set( "reset_data", ([
        "jack":  NEWBIE + "Mon/jackripper"
      ]) );
    set( InsideP, 1 );
}
