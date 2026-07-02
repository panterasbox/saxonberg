//  Genious: newbie/evil07.c
//  Written by Hannah on 12/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "Abandoned House" );
    set( "day_long",
     "You find yourself inside an abandoned house.  Most of the furniture "+
     "has long since been stolen, and what remains is broken glass, pieces "+
     "of wood, and trash everywhere." );
    set( "day_light", DARK );

    set( "exits", ([ "east": "evil06" ]) );

    set( "descs", ([
      "house":
          "This place is decrepid and smells bad.",
      ({ "glass", "broken glass" }):
          "You try to step carefully around the broken glass.",
      "wood":
          "You see nothing special about the rotten wood.",
      "trash":
         "You find nothing of interest among the trash." ]) );

    set( "reset_data", ([ "dealer": NEWBIE + "Mon/drug_dealer" ]) );
}
