//  Genious: newbie/evil13.c
//  Written by Hannah on 12/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "A Hot, Steamy Tunnel" );
    set( "day_long",
      "The tunnel comes to an end here.  There is a hole in the ground, "+
      "and it seems to be the source of all the sticky steam.  The opening "+
      "looks big enough for you to fit through...but do you dare?" );
    set( "day_light", NO_LIGHT, NO_LIGHT );

    set( "exits", ([ "west": "evil12",
                     "down": "evil14" ]) );

    set( "descs", ([
      ({ "tunnel","steamy tunnel" }):
          "The tunnel ends here.",
      ({ "hole", "opening", "steam" }):
          "Hot steam rises from the hole in the ground." ]) );

    set( InsideP, 1 );
}
