//  Genious: newbie/good12.c
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
        "This is a north/south path that runs through the east side of the "+
        "village.  The houses and shops around you are painted in bright, "+
        "happy colors.  To the north, you see that the village path leads up "+
        "to a small house." );
    set( "day_light", SUNLIGHT );
    set( "night_light", SUNLIGHT );

    set( "exits", ([ "north": "good11",
                     "south": "good05",
                     "east":  "armory",
                     "west":  "smithy" ]) );

    set( "descs", ([
      "path":
          "The path through the village runs from north to south.",
      "village":
          "The village is a very happy place.",
      "houses":
          "The houses look well-tended, with pretty trees and flowers in "+
          "front.",
      "house":
          "The house to the north is a simple structure that is painted a "+
          "bright blue.",
      ({ "shops", "shop" }):
          "The armory and the smithy look clean and bright.",
      "armory":
          "The armory is a small building that is painted a bright red.",
      "smithy":
          "The smithy is a small building that is painted a bright green."
    ]) );
}
