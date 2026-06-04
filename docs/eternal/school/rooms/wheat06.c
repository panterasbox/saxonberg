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
      "The countless rows of golden wheat would seem to march on forever "
      "if they didn't run into the incredible granite cliff that looms up "
      "into the sky.  The cliff face runs as far as you can see to the "
      "east and west, prohibiting any further travel to the north."
    );
   set("descs", ([
	   ({ "grain","row","rows", "wheat" }) :
	      "This grain is rich and plentiful.  It has taken root in the "
	      "warm black soil that makes up this sheltered plain.  The stalks "
	      "of grain line up in careful rows as far as your eye can see.",
	   ({ "cliff", "face", "cliff face" }) :
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
	   "west":ROOMS+"wheat05",
	   "east":ROOMS+"wheat07",
	   "south":ROOMS+"wheat16",
	   "southeast":ROOMS+"wheat17",
	   "southwest":ROOMS+"wheat15",
      ]) );
}
