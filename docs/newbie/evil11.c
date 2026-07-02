//  Genious: newbie/evil11.c
//  Written by Hannah on 12/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "Leaky Basement" );
    set( "day_long",
      "Dark shadows surround you as you poke around this basement "+
      "underneath the old pub.  A few rusty pipes hang overhead, dripping "+
      "water and forming a few smelly puddles.  There seems to be mold "+
      "everywhere.  You notice a set of stairs going up." );
    set( "day_light", NO_LIGHT );

    set( "exits", ([ "up":    "evil10",
                     "south": "evil12" ]) );

    set( "descs", ([
      "basement":
          "Just look around.",
      ({ "pipes", "rusty pipes" }):
          "The pipes are old and rusted.",
      "water":
          "The water goes, \"Drip...  Drip...  Drip...\"",
      ({ "puddles", "smelly puddles" }):
          "The puddles are everywhere; you have a hard time avoiding them.",
      "mold":
          "The patches of mold seem to make an odd pattern on the wall...  "+
          "You could almost swear that it looked like a large, grinning "+
          "countenance, one that seems almost demonic, staring back at you...",
      "stairs": "The stairs look dark." ]) );

    set( InsideP, 1 );
}
