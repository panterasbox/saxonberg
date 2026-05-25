#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("reset_data", 
   ([ "child" : MON+"goblinchild",
      "mother" : MON+"goblinmother"
   ]) );
   set("short", "A Goblin Shack");
   set("day_long",
      "This is a small goblin shack.  You don't know much about goblins, but "
      "they sure do leave one heck of a mess in their shacks.  The one thing "
      "you do remember hearing is that the mothers are fiercely loyal and "
      "protective of their children.");
   set("day_light", 80);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", 
   ([ 
      "up" : ROOMS+"lesson6",
   ]) );
   
}
