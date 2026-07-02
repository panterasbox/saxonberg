//  Genious: newbie/good08.c
//  Written by Hannah on 11/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "Rainbow Village" );
    set( "ansi_short", ESC + "[31m" + "R" +
      ESC + "[33m" + "a" + ESC + "[32m" + "i" + ESC + "[36m" + "n" +
      ESC + "[34m" + "b" + ESC + "[35m" + "o" + ESC + "[31m" + "w" +
      ESC + "[2;37;0m" + ESC + "[0;0m" + " Village" );
    set( "day_long",
      "This is a north/south path that runs through the west side of this "+
      "fine village.  Ahead to the north, you see the spires of an old "+
      "church.  To the south you can see a small stone building." );
    set( "day_light", SUNLIGHT );
    set( "night_light", SUNLIGHT );

    set( "exits", ([ "north": "good09",
                     "south": "good07" ]) );

    set( "descs", ([
      "path":
          "This is a simple dirt path that runs north and south.",
      "church":
          "The church is a simple building, painted white.",
      ({ "spires", "church spires" }):
          "You see nothing special about the church spires.",
      ({ "building", "clinic", "stone building", "small stone building" }):
          "The building to the south is a doctor's clinic." ]) );
}
