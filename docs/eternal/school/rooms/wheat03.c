#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("short","On the Northern Edge of a Vast Field of Wheat");
   set( "day_long",
      "This is the end of the wheatfield.  You're standing in front of "
      "an immense granite cliff that entirely blocks any imaginable "
      "travel to the north.  In all other directions around you, the "
      "rows of wheat stretch to the end of your ability to see.");
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
	   "west":ROOMS+"wheat02",
	   "east":ROOMS+"wheat04",
	   "south":ROOMS+"wheat13",
	   "southeast":ROOMS+"wheat14",
	   "southwest":ROOMS+"wheat12",
      ]) );
}
