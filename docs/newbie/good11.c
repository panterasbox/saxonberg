//  Genious: newbie/good11.c
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
        "A sudden feeling of comfort and homeyness overwhelms you.  This "+
        "is one of the homes of the village.  This is probably the coziest "+
        "place you have ever had the good fortune to be in.  The place is "+
        "tastefully decorated, with plush furniture and a shaggy rug." );
    set( "day_light", PART_LIT );
    set( "night_light", PART_LIT );

    set( "exits", ([ "west":  "good10",
                     "south": "good12" ]) );

    set( "descs", ([
    ({"sofa","armchair"}):
        "The sofa has a floral pattern, the armchair looks comfortable.",
      "furniture":
          "You can see a comfy sofa with a flower pattern, and an armchair.",
      "rug":
          "The circular rug is several tones of brown." ]) );

    set( "reset_data", ([ "rugrat": NEWBIE + "Mon/child",
                          "daddy":  NEWBIE + "Mon/father" ]) );
}
