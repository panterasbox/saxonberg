//  Genious: newbie/evil09.c
//  Written by Hannah on 11/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "City Ruins" );
    set( "day_long",
      "The ravaged shells of buildings that were once shops and homes "+
      "surround you.  This wasteland seems to no longer support even the "+
      "hardiest of weeds.  As you walk down the asphalt road you try to "+
      "avoid tripping on the giant potholes." );
    set( "day_light", DIM );

    set( "exits", ([ "south": "evil05",
                     "north": "evil10" ]) );

    set( "descs", ([
      "buildings":
          "The buildings look unsafe, ready to collapse at any time.",
      "wasteland":
          "Just look around.",
      ({ "road", "asphalt", "asphalt road", "ground" }):
          "The road, or what is left of it, is in very bad shape.",
      ({ "potholes", "giant potholes" }):
          "The potholes are quite large and you have some difficulty "+
          "maneuvering around them." ]) );

    set( "reset_data", ([ "terrorist": NEWBIE + "Mon/terrorist" ]) );
}
