//  Genious: newbie/evil08.c
//  Written by Hannah on 12/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "Dirty Alley" );
    set( "day_long",
      "This is a dark alley within the ruins of the city.  Soot and "+
      "garbage cover the ground and the alley walls.  You try hard to avoid "+
      "stepping in the greasy puddles of water." );
    set( "day_light", DARK );

    set( "exits", ([ "south": "evil06" ]) );

    set( "descs", ([
      "alley":
          "You look at the filth and grime that surrounds you and feel a "+
          "bit disgusted.",
      "soot":
          "You notice some paw prints in the soot on the ground.",
      "garbage":
          "The garbage is strewn about throughout the alley.",
      "ground":
          "The ground is filthy.",
      ({ "walls", "alley walls" }):
          "The walls look about ready to collapse.",
      ({ "water", "puddles", "greasy puddles" }):
          "You see nothing special about the slick puddles of water." ]) );

    set( "reset_data", ([ "dog": NEWBIE + "Mon/rabid_dog" ]) );

    set( OutsideP, 1 );
}
