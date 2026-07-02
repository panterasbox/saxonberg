//  Genious: newbie/good07.c
//  Written by Hannah on 11/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "Rainbow Village Clinic" );
    set( "ansi_short", sprintf(
      "%c[31mR%c[33ma%c[32mi%c[36mn%c[34mb%c[35mo%c[31mw%c[0m%c[2;37;0m %s",
      27, 27, 27, 27, 27, 27, 27, 27, 27, "Village Clinic" ) );
    set( "day_long",
       "This small stone building serves as the medical center for the "+
       "village.  The shelves are full of bandages, splints, and jars of "+
       "potions.  The clinic has an antiseptic smell." );
    set( "day_light", WELL_LIT );
    set( "night_light", WELL_LIT );

    set( "exits", ([ "east":  "good06",
                     "north": "good08" ]) );

    set( "descs", ([
      ({ "shelves", "shelf" }):
          "The shelves are full of all sorts of medical junk.",
      ({ "bandages", "bandage" }):
          "The bandages are safely locked away.",
      ({ "splints", "splint" }):
          "The splints are safely locked away.",
      ({ "potions", "potion", "jars", "jars of potions" }):
          "The jars of potions are safely locked away." ]) );

    set( "reset_data", ([ "drquinn": NEWBIE + "Mon/doctor" ]) );
}
