//  entrance.c
//  written by Hannah on 11/92

inherit RoomPlusCode;
#include "../GPaths.h"


void extra_create()
{
    seteuid( "genious_member" );
    set( "short", "A Green Path");
    set( "day_long", 
      "You have come upon a little green path that miraculously begins " +
      "at the edge of the desert...  You feel there is some magic afoot " +
      "here.  The sun seems to hang perpetually in the sky.");
    set( "day_light", SUNLIGHT );

    set( "exits", ([ "north": "wall",
                     "south": DESERT + "desert03" ]) );

    set( "descs", ([
      "path": "Try looking around.",
      "desert":
        "The desert to the south looks huge and unfriendly.  Miles and " +
        "miles of golden sand appear like shimmering satin waves.",
      "sun": "Looking at the sun is not a good idea.",
      "sky": "It's as blue as blue can be." ]) );

    set( OutsideP, 1 );
    set( NoPKP, 1 );
}
