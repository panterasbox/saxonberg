#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("reset_data", 
      (["pig" : MON+"pig",
        "pig2" : MON+"pig" 
      ]) );
   set("short","On the Western Edge of a Vast Field of Wheat");
   set( "day_long",
      "You've come to the western-most edge of the wheatfield.  From this "
      "point on as far as you can see to the west is total blackness.  In "
      "all other directions, rows of wheat extend into the distance.");
   set("descs", ([
	   ({ "grain","row","rows", "wheat" }) :
	      "This grain is rich and plentiful.  It has taken root in the "
	      "warm black soil that makes up this sheltered plain.  The stalks "
	      "of grain line up in careful rows as far as your eye can see.",
	   ({"blackness","abyss"}) :
	      "You peer into the darkness, but you can see nothing more but utter "
	      "nothingness.  Not even the sound of your voice can penetrate the "
	      "complete lack of anything.",
      ]) );
   set(OutsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", ([
	   "north":ROOMS+"wheat00",
	   "east":ROOMS+"wheat11",
      "northeast":ROOMS+"wheat01",
	   "southeast":ROOMS+"wheat22",
	   "south":ROOMS+"wheat20",
      ]) );
}
