//  Genious: newbie/evil03.c
//  Written by Hannah on 11/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "Dark Path" );
    set( "day_long",
      "This is a small, dark path that twists and turns through a small " +
      "forest of dead trees.  The cold, damp air makes you shiver, and " +
      "the sounds of chanting from the east fills you with great dread." );
    set( "day_light", DIM );

    set( "exits", ([ "west": "evil02",
                     "east": "evil04" ]) );

    set( "descs", ([
      "path":
          "The path is gloomy and twisty.",
      ({ "forest", "trees", "dead trees" }):
          "The forest trees look scary.  You shiver." ]) );
}
