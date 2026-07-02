//  Genious: newbie/good04.c
//  Written by Hannah on 11/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "Entrance to Rainbow Village" );
    set( "ansi_short", "Entrance to " + ESC + "[31m" + "R" +
      ESC + "[33m" + "a" + ESC + "[32m" + "i" + ESC + "[36m" + "n" +
      ESC + "[34m" + "b" + ESC + "[35m" + "o" + ESC + "[31m" + "w" +
      ESC + "[2;37;0m" + ESC + "[0;0m" + " Village" );
    set( "day_long",
      "This is the hustling, bustling outskirts of Rainbow Village.  " +
      "Everyone who passes by has a smile on his or her face, and the " +
      "warm sun shines down on the brightly-colored clothing of the " +
      "villagers, making the world look happy and radiant." );
    set( "day_light", SUNLIGHT );
    set( "night_light", SUNLIGHT );

    set( "exits", ([
      "north": "good05",
      "south": "good02" ]) );

    set( "descs", ([
      "outskirts": "Try looking around.",
      "sun":
          "Looking at the sun is bad for your eyes.",
      "villagers":
          "The inhabitants of Rainbow Village appear joyful and full of the "+
          "zest for life.",
      "clothing":
          "The villagers' outfits come in all the colors of the rainbow.  "+
          "Every bit of clothing appears freshly laundered." ]) );
}
