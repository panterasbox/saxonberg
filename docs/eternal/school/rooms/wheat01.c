#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("reset_data", 
      (["sheep" : MON+"sheep",
        "sheep2" : MON+"sheep" 
    ]) );
   set("short","On the Northern Edge of a Vast Field of Wheat");
   set( "day_long",
      "You are at the northern edge of a huge field of wheat.  The field "
      "ends abruptly to the north at a blank, granite cliff face.  The "
      "rows of wheat stretch as far as your eye can see in every other "
      "direction.");
   set("descs", ([
	   ({ "grain","row","rows", "wheat" }) :
	      "This grain is rich and plentiful.  It has taken root in the "
	      "warm black soil that makes up this sheltered plain.  The stalks "
	      "of grain line up in careful rows as far as your eye can see.",
	   ({ "cliff", "face", "cliff face", "wall", "granite" }) :
	      "This cliff face goes straight up for about 300 feet and then "
	      "gradually inclines to form huge, sky-piercing peaks of "
	      "granite.  As you incline your head to look at the cliff, high "
	      "in the sky you see something floating along up there.  It's not "
	      "a bird, it's not a star...  What could it be?"
      ]) );
   set(OutsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", ([
	   "west":ROOMS+"wheat00",
	   "east":ROOMS+"wheat02",
	   "south":ROOMS+"wheat11",
	   "southeast":ROOMS+"wheat12",
	   "southwest":ROOMS+"wheat10",
      ]) );
}
