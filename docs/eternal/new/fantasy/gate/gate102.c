 
/*  04-19-95 -- Walker -- Basic framework and whatever            */
 
inherit RoomCode;
 
#include "path.h"
 
void extra_create()
  {
  set("short", "Ascending Road to the Eternal City");
  set("day_long", 
    "  I'll think of a better desc for this room some other day.");
  set( "day_light", 60 );
  set( "exits", ([
    "down"  : "gate103",
    "north" : "gate101",
    ]) );
  set( "invis_exits", ([
    "south" : "gate103",
    ]) );
  set( OutsideP, 1 );
  }
 
string exit_message( string dir )
{
    if(( dir == "south" ) || ( dir == "down" ))
        return( "down the road, to the south" );
    return( 0 );
}
