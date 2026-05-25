inherit RoomCode;
 
#include "path.h"
#define MONITOR "/obj/special/lagmonitor"
  
// Changed this room so it doesn't clone a lag monitor, just uses
// the master copy  Deathdealer April 1994
 
void extra_create()
{
    set( "ansi_short", GRN + "EotL Operations Room" );
    set( "short", "EotL Operations Room" );
    set( "day_color", GRN );
    set( "day_long",
      "This is a small, stuffy chamber a few meters below the "
      "Heart of Eternal City.  A pale, green flourescence from "
      "the walls here offer little in terms of illumination, "
      "but suffice to bring the major features of the room into "
      "view.  Several metal rungs affixed to the sides of a hole "
      "in the ceiling of this place lead out." );
    set( "day_light", WELL_LIT );
    set( "exits", ([
      "up" : "hea(0,0,0)",
      ]) );
 
    "/obj/calendar"->query_dayornight();
 
    MONITOR->bogleg();
 
    set( "reset_data", ([
      "mtr_obj" : "/obj/special/uptime_meter",
      "mon_obj" : MONITOR,
      ]) );
    set( InsideP, 1 );
}
