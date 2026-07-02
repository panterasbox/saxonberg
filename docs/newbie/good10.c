//  Genious: newbie/good10.c
//  Written by Hannah on 12/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "Rainbow Village" );
    set( "ansi_short", ESC + "[31m" + "R" +
      ESC + "[33m" + "a" + ESC + "[32m" + "i" + ESC + "[36m" + "n" +
      ESC + "[34m" + "b" + ESC + "[35m" + "o" + ESC + "[31m" + "w" +
      ESC + "[2;37;0m" + ESC + "[0;0m" + " Village" );
    set( "day_long",
       "This is an east/west path that runs through the north side of the "+
       "village.  To the west you can see the spires of an old church, and "+
       "to the east you see a small house." );
    set( "day_light", SUNLIGHT );
    set( "night_light", SUNLIGHT );

    set( "exits", ([ "east": "good11",
                     "west": "good09" ]) );
 
    set( "descs", ([
      "path":
          "This section of path around the village runs east to west.",
      ({ "spires", "church spires" }):
          "The church spires rise majestically toward the sky.",
      ({ "church", "old church" }):
          "The church is a simple building painted white.",
      ({ "house", "small house" }):
          "The house to the east is painted blue." ]) );
}
