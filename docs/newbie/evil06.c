//  Genious: newbie/evil06.c
//  Written by Hannah on 12/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "City Ruins" );
    set( "day_long",
      "Decaying and crumbling buildings surround you as you find yourself "+
      "in what was once a city street.  As you walk down the street, you "+
      "hear the sounds of scurrying feet, and feel that someone or "+
      "something is watching you." );
    set( "day_light", PART_LIT );

    set( "exits", ([ "east":  "evil05",
                     "west":  "evil07",
                     "north": "evil08" ]) );

    set( "descs", ([
      "buildings":
          "The decaying buildings have been abandoned for years and appear " +
          "to be dangerous.",
      ({ "street", "road", "ground" }):
          "The street is full of potholes where the asphalt still remains.",
      ({ "pothole", "potholes" }):
          "There are so many potholes around and you step gingerly around " +
          "them." ]) );
}
