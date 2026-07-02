//  Genious: newbie/evil12.c
//  Written by Hannah on 12/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "Steam Tunnel" );
    set( "day_long",
      "The air around you is hazy and hot.  The thick moisture in the air "+
      "makes breathing difficult.  To the north is the Pub basement.  The "+
      "dark tunnel continues to the east." );
    set( "day_light", NO_LIGHT );

    set( "exits", ([ "north": "evil11",
                     "east":  "evil13" ]) );

    set( "descs", ([
      "tunnel":
          "This does't seem to be an ordinary tunnel.  This one feels as "+
          "though it leads into the frightening depths of the earth." ]) );

    set( "reset_data", ([ "demon": NEWBIE + "Mon/incubus" ]) );

    set( InsideP, 1 );
}
