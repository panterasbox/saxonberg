inherit RoomCode;
#include "/zone/null/eternal/eternal.h"
 
void extra_create() {
  set( "short", "A Vacant Lot" );
  set( "day_long",
    "A sharp breeze tugs at weeds patches scattered "
    "about this empty spot of land.  Judging from "
    "its size, a large building must have stood here "
    "once.  You can step south back onto Eternal Way "
    "if you so wish." );
  set( "exits", ([ "south":"room036" ]) );
  set( OutsideP, 1 );
  set( "reset_data", ([
    "jug" : "/zone/null/eternal/objects/jug",
    "corpse" : "/zone/null/eternal/objects/corpse" ]) );
  }
