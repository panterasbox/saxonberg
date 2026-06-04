 
/*  04-19-95 -- Walker -- Basic framework and whatever            */
 
inherit RoomCode;
 
#include "path.h"
 
void extra_create()
  {
  set( "short", "Outside of the Gate of Technology" );
  set("day_long", 
    "  I'll think of a better desc for this room some other day.");
  set( "day_light", 60 );
  set( "exits", ([
    "north" : "gate400",
    ]) );
  set( OutsideP, 1 );
  }
 
string exit_message( string dir )
{
    if(( dir == "north" ) || ( dir == "up" ))
        return( "up the road to the north, entering the Gate" );
    return( 0 );
}
