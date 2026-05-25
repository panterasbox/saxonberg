#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("reset_data", 
   (["troll" : MON+"troll",
     "troll2" : MON+"troll" 
   ]) );
   set("short", "A Troll Lair");
   set("day_long",
      "This is a troll lair.  The trolls who usually occupy it are smelly, "
      "nasty, loud creatures.  They are known for fighting to the death, "
      "and once you attack them, they may not let you get away.  Trolls "
      "don't have much loyalty though, and these ones won't defend each "
      "other.");
   set("day_light", 80);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", 
   ([ 
      "south" : ROOMS+"lesson6",
   ]) );
   
}
