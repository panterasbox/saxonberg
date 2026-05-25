//  drop_dock.c
inherit RoomPlusCode;
#include "/zone/future/postapoc/android/droids.h"

#define DOCKNAME "Eternal City"
object dropship;

void extra_create()
{
    set( "short", "A Grey Platform" );
    set( "day_long",
      "You are standing on a smooth grey platform made from some "+
      "tough yet oddly spongy material.  In the center of this platform "+
      "is a 10 meter diameter circle with a large 'D' in the center."
    );
    set( "exits", ([ "down": "alley2" ]) );
    THISO->set("dropdock",1);
}

void extra_reset()
{
    DS_BAY->add_dock( THISO );
}

string query_dock_name()
{
    return( DOCKNAME );
}
