//  Genious: newbie/good06.c
//  Written by Hannah on 11/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "Rainbow Village" );
    set( "ansi_short", sprintf(
      "%c[31mR%c[33ma%c[32mi%c[36mn%c[34mb%c[35mo%c[31mw%c[0m%c[2;37;0m %s",
      27, 27, 27, 27, 27, 27, 27, 27, 27, "Village" ) );
    set( "day_long",
      "The road continues through the village.  There are all sorts of shops "+
      "and houses, painted in bright colors, along the road.  Merchants, "+
      "craftspersons, and children can be found everywhere.  You feel that "+
      "this is a happy place." );
    set( "day_light", SUNLIGHT );
    set( "exits", ([
      "east":  "good05",
      "west":  "good07",
#if 0
    "north": "bakery",
#endif // This hasn't loaded in quite some time -- Nyg
      "south": "inn_anteroom"
    ]) );
    set( "descs", ([
      "road":
          "The road through the village runs east and west.",
      "shops":
          "The shops look busy.",
      ({ "houses", "house" }):
          "The houses look comfortable and homey.",
      "merchants":
          "The merchants appear content that business is good.",
      "craftpersons":
          "The craftpersons seem happy with the workmanship of their "+
          "merchandise.",
      "children":
          "The children look happy and well-adjusted."
    ]) );
    set( "reset_data", ([ "nicedoggy": NEWBIE + "Mon/lassie" ]) );
    set( OutsideP, 1 );
}
