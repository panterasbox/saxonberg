//  inn_anteroom.c
//  written by Hannah on 10/94

#include "Newbie.h"

string *sofa_list;


void extra_create()
{
    set( "short", "Entrance to the Inndigo" );
    set( "day_long",
      "Welcome to the Inndigo, an small inn that serves as a resting place "+
      "for tired adventurers.  This room is the lobby to the inn.  The "+
      "walls are covered with many old paintings as well as by a maroon and "+
      "ivory colored wallpaper." );
    set( "day_light", WELL_LIT );
    set( "night_light", PART_LIT );

    set( "exits", ([ "north": "good06",
                     "up":    "inn" ]) );

    set( "descs", ([
      "sofa": "@look_at_sofa" ]) );

    set( "reset_data", ([ "machine": "/zone/null/toys/bin/machine" ]) );
//                          "comfy": NEWBIE + "Obj/sofa" ]) );
}
