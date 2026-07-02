//  Genious: newbie/evil04.c
//  Written by Hannah on 11/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "Witches' Coven" );
    set( "day_long",
      "Dark, twisted trees surround this cold and dank clearing.  You can't "+
      "seem to be able to shake the feeling of great evil nearby.  This "+
      "dreaded place seems to be a favorite gathering place for evil " +
      "witches." );
    set( "day_light", DIM );

    set( "exits", ([ "west": "evil03" ]) );

    set( "descs", ([
      ({ "trees", "tree" }):
          "The trees appear to be long dead.  They remind you of skeletons.",
      "clearing":
          "You feel terrified just from standing here.  You want to get away."
    ]) );

    set( "reset_data", ([ "witch":    NEWBIE + "Mon/witch",
                          "cauldron": NEWBIE + "Obj/cauldron" ]) );
}
