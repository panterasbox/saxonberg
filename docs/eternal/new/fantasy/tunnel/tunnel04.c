 
/*  04-19-95 -- Walker -- Basic framework and whatever            */
 
inherit RoomCode;
 
#include "path.h"
 
void extra_create()
  {
  set("short", "A Tunnel Beneath the City");
  set("day_long", 
    "  I'll think of a better idea for this room some other day.  Oh "+
    "yeah, the tunnel turns into a streamlined hallway to the north");
  set( "day_light", 60 );
  set( "exits", ([
    "north" : "complex00",
    "east"  : "tunnel05",
    "west"  : "tunnel03",
    ]) );
  set( InsideP, 1 );
  set( UndergroundP, 1 );
  set( NoTeleportP, 1 );
  }
