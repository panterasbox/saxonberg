 
/*  04-19-95 -- Walker -- Basic framework and whatever            */
 
inherit RoomCode;
 
#include "path.h"
 
void extra_create()
  {
  set("short", "The Gate of the Ocean");
  set("day_long", 
    "  I'll think of a better desc for this room some other day.");
  set( "day_light", 60 );
  set( "exits", ([
    "down" : "gate101",
    "east" : HOME + "room001",
    ]) );
  set( "invis_exits", ([
    "south" : "gate101",
    ]) );
  set( OutsideP, 1 );
  }
 
string exit_message( string dir )
{
    if(( dir == "south" ) || ( dir == "down" ))
        return( "down the sloping road to the south" );
    return( 0 );
}
