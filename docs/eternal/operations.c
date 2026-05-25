/* /room/operations */
#include "/zone/null/eternal/eternal.h"

#define MONITOR "/obj/client/lagmonitor"
#define METER "/obj/client/meter"

inherit RoomPlusCode;

void extra_reset()
{
  call_other( MONITOR, "???" );
}

void extra_create()
{
  set( "short","EotL Operations Room");
  set( "day_long",
   "This is a small, stuffy chamber a few meters below the "+
   "Heart of Eternal City.  A pale, green fluorescence from "+
   "the walls here offer little in terms of illumination, "+
   "but suffice to bring the major features of the room into "+
   "view.  Several metal rungs affixed to the sides of a hole "+
   "in the ceiling of this place lead out.  A small grate "+
   "has been left open in the floor."
  );
  set( "day_light", WELL_LIT );
  set( "descs", ([
    "grate" : "It may be rusty, but it is still a happy grate!",
    ]) );
  set( "exits", 
   ([
    "up" :  "/zone/null/eternal/common",
//  "down" : "/zone/guild/capacitor/tunnel1",
    "down" : "/zone/null/underworld/sewer/op_link1",
   ]) );
  set( "reset_data",
   ([
    "meter" : METER,
   ])
  );

  set( InsideP, 1 );
}
