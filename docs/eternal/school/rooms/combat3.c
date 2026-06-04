#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("reset_data", 
   ([ "yellowjacket" : MON+"yellowjacket" ]) );
   set("short", "A Small Field");
   set("day_long",
      "You find yourself in a small field.  That buzzing sound you heard earlier "
      "was yellowjackets.  Most of them seem to have moved on, but the stragglers "
      "look pretty angry.");
   set("day_light", 80);
   set(OutsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", 
   ([ 
      "southwest" : ROOMS+"lesson6",
   ]) );
   
}
