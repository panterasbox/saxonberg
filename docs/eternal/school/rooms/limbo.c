#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;


void extra_create()
{   
   set("short", "Mid Air");
   set("day_long",
     "High above Eternal City, everyone looks like an ant.  You can barely "
     "make out the buildings below.  You are just below the clouds, and "
     "it feels slightly damp up here. ");
   set("day_light", 80);
   set("night_light", 80);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
}


