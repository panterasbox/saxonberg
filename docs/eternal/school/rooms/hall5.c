#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;


void extra_create()
{
   
   set("short", "Newbie School Stairway");
   set("day_long",
     "This is a dark and dismal stairway.  Half of the lights are out, and "
     "the remaining bulbs barely provide enough illumination to see.  The "
     "stairway leads up towards the first level of the school.  The growling "
     "noise you heard before seems to be closer.  To the south, you see more "
     "classrooms.");
   set("day_light", 50);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", 
   ([ 
      "up" : ROOMS+"hall4",
      "south" : ROOMS+"hall6"
   ]) );
   

}




