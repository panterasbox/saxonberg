//  Genious: newbie/good03.c
//  Written by Hannah on 11/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "Quiet Glade" );
    set( "day_long",
      "This is a serene little grassy area, edged by a small woods made "+
      "up of mostly conifers.  A road is nearby to the east.  If you're " +
      "lucky, you might find a wild animal or two grazing about." );
    set( "day_light", SUNLIGHT );
    set( "night_light", SUNLIGHT );

    set( "exits", ([ "east":  "good02" ]) );

    set( "descs", ([
      ({ "woods", "small woods", "trees", "tree", "conifers", "conifer",
        "evergreens" }):
          "The evergreen woods surround this lovely glade.",
      "road":
          "The road to the east leads from Rainbow Village to the " +
          "Crossroads." ]) );

    set( "reset_data", ([ "bambideer":    NEWBIE + "Mon/bambi",
                          "thumperbunny": NEWBIE + "Mon/thumper" ]) );
}
