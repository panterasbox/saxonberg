 
/*  04-19-95 -- Walker -- Basic framework and whatever            */
 
inherit RoomCode;
 
#include "path.h"
 
void extra_create()
  {
  set("short", "A Tunnel Beneath the City");
  set("day_long", 
    "  I'll think of a better idea for this room some other day.");
  set( "day_light", 60 );
  set( "exits", ([
    "southeast" : "tunnel06",
    "west"      : "tunnel04",
    ]) );
  set( InsideP, 1 );
  set( UndergroundP, 1 );
  set( NoTeleportP, 1 );
  }
