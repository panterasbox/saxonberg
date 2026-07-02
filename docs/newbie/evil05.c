//  Genious: newbie/evil05.c
//  Written by Hannah on 12/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "A Bend in a Dark Road" );
    set( "day_long",
      "As a light mist blows by, you notice an asphalt road that turns from "+
      "west to north.  It is too hazy to see where the road leads in either "+
      "direction.  To the south you notice a filthy stream." );
    set( "day_light", DIM );

    set( "exits", ([ "north": "evil09",
                     "south": "evil02",
                     "west":  "evil06" ]) );

    set( "descs", ([
      "mist":
          "The mist makes things hard to see.",
      ({ "road", "asphalt road", "asphalt" }):
          "The asphalt road goes from west to north.",
      "stream":
          "The stream is dark and foul-smelling.  Go south for a closer look."
    ]) );
}
