 
/*  04-19-95 -- Walker -- Basic framework and whatever            */
 
inherit RoomCode;
 
#include "path.h"
 
void extra_create()
  {
  set("short", "The Gate of Technology");
  set("day_long", 
   "  You are standing underneath a large archway built of "+
   "smooth, shining steel.  The guards checking those "+
   "coming in and out of the city pause occasionally to "+
   "type information into small consoles built into the "+
   "side of the arch.  To the north lies the interior of "+
   "the Eternal City, and southward lies a small complex "+
   "housing an elevator system to take you to the base of "+
   "the plateau.");
  set( "day_light", 60 );
  set( "exits", ([
    "south" : "@south",
    "north" : "@north",
    ]) );
  set( OutsideP, 1 );
  }
 
north()
  {
  if( THISP -> query_last_room() !=
    (object) "/zone/future/emetic/eternal/city/room034" )
    {
    write( "The guard checks your inventory for contraband.\n" );
    write( "The guard waves you through, and you pass into the city.\n" );
    return ( HOME "room034" );
    }
  return ( HOME "room034" );
  }

south() {
  if( THISP -> query_last_room() !=
    (object) "/zone/future/emetic/eternal/gates/gate401" )
    {
    write( "The guard checks your inventory for contraband.\n" );
    write( "The guard waves you through, and you pass out of the city.\n" );
    return( GATE "gate401" );
    }
  return( GATE "gate401" );
  }
