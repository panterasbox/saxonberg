#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("short","On the Northern Edge of a Vast Field of Wheat");
   set( "day_long",
      "As you emerge from between the rows of wheat, you arrive face to "
      "face with an impenetrable wall of solid granite.  This tremendous "
      "cliff face stretches to the east and west for as far as you can "
      "see, blocking any further passage to the north.  Surrounding you "
      "to all other directions are innumerable rows of golden wheat."
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
	   "west":ROOMS+"wheat04",
	   "east":ROOMS+"wheat06",
	   "south":ROOMS+"wheat15",
	   "southeast":ROOMS+"wheat16",
	   "southwest":ROOMS+"wheat14",
      ]) );
}
