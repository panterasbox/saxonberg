/* /room/operations */
 
#define MONITOR "/obj/special/lagmonitor"
 
inherit RoomCode;
 
// Changed this room so it doesn't clone a lag monitor, just uses
// the master copy  Deathdealer April 1994
 
void extra_create()
{
    set( "short","EotL Operations Room");
    set( "day_long",
      "This is a small, stuffy chamber a few meters below the "+
      "Heart of Eternal City.  A pale, green flourescence from "+
      "the walls here offer little in terms of illumination, "+
      "but suffice to bring the major features of the room into "+
      "view.  Several metal rungs affixed to the sides of a hole "+
      "in the ceiling of this place lead out."
    );
    set( "day_light", WELL_LIT );
    set( "exits", 
       ([
          "up" :  "common",
       ]) );
 
    "/obj/calendar"->query_dayornight();
 
    MONITOR->bogleg();
 
    set( "reset_data",
      ([
         "mtr_obj"  : "/obj/special/uptime_meter",
         "mon_obj"  : MONITOR,
      ]) );
}
