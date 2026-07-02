//  Genious: newbie/good05.c
//  Written by Hannah on 11/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "Rainbow Village" );
    set( "ansi_short", sprintf(
      "%c[31mR%c[33ma%c[32mi%c[36mn%c[34mb%c[35mo%c[31mw%c[0m%c[2;37;0m %s",
      27, 27, 27, 27, 27, 27, 27, 27, 27, "Village" ) );
    set( "day_long",
      "This little community is a-buzz with activity.  All sorts of " +
      "people travel through this town, and all of them are happy " +
      "with the world and with life in general.  Everyone who passes " +
      "by says, \"Hello!\" to everyone else.  The road leaving the " +
      "village is to the south." );
    set( "day_light", SUNLIGHT );
    set( "exits", ([
      "north": "good12",
      "south": "good04",
      "west":  "good06"
    ]) );
    set( "descs", ([
      "people":
          "You have probably never seen so many happy and content people " +
          "in one place in your life.",
      "road":
          "The village road forks north and west, and leaves the village " +
          "south."
    ]) );
    set( "reset_data", ([ "someone": NEWBIE + "Mon/villager"]) );
    set( OutsideP, 1 );
}
