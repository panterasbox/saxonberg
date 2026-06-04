#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;


void extra_create()
{
   
   set("short", "Newbie School Stairway");
   set("day_long",
     "This is a dark and dismal stairway.  Half of the lights are out, and "
     "the remaining bulbs barely provide enough illumination to see.  The "
     "stairway leads down towards the next set of classes.  In the distance, "
     "you hear a faint growling noise.");
   set("day_light", 50);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", 
   ([ 
      "down" : ROOMS+"hall5",
      "south" : ROOMS+"hall3"
   ]) );
   

}




