 
/*  04-19-95 -- Walker -- Basic framework and whatever            */
 
inherit RoomCode;
 
#include "path.h"
 
void extra_create()
  {
  set("short", "The Smuggler's Gate");
  set("day_long", 
    "  I'll think of a better idea for this room some other day.");
  set( "day_light", 60 );
  set( "exits", ([
    "west" : "gate501",
    "east" : TUNNELS + "tunnel10",
    ]) );
  set( InsideP, 1 );
  set( UndergroundP, 1 );
  set( NoTeleportP, 1 );
  }
