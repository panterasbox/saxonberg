#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("short","On the Northern Edge of a Vast Field of Wheat");
   set( "day_long",
      "You're standing at the northern edge of a vast wheatfield.  All "
      "around you (except to the north) row after row of the proverbial "
      "amber waves of grain stretch to the horizon.  However, to your "
      "north is a huge wall of gray granite.  This cliff face extends "
      "to the east and west, blocking your passage to the north.");
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
	   "west":ROOMS+"wheat01",
	   "east":ROOMS+"wheat03",
	   "south":ROOMS+"wheat12",
	   "southeast":ROOMS+"wheat13",
	   "southwest":ROOMS+"wheat11",
      ]) );
}
