inherit RoomCode;

#include "path.h"

#define STREET "/zone/null/eternal/room025.c"

void extra_create()
  {
  set( "short", "The Eternal City Library" );
  set( "day_long",
    "You can exit the library to the north.  There is "
    "an information desk here too.  This desc will be "
    "better someday... Really." );
  set( InsideP, 1 );
  set( "exits", ([
    "north" : "@north",
    "west" : "lib2",
    "south" : "lib3"
    ]) );
  set( "day_light", 60 );
  }

north()
  {
  tell_room( STREET, strformat( PNAME + " steps "
    "out of the library through an automatic door." ) );
  tell_object( THISP, strformat( "You step through "
    "the automatic door and out onto the street." ) );
  tell_room( THISO, strformat( PNAME + " steps through "
    "the automatic door and out onto the street." ),
    ({ THISP }) );
  return( STREET );
  }
