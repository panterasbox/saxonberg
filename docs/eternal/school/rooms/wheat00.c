#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("short","At the Northwestern Corner of a Vast Field of Wheat");
   set( "day_long",
      "You are standing at the very edge of the wheatfield.  You can go "
      "no further to the west and no further to the north.  To the west, "
      "the land falls away and all you can see is unending blackness.  To "
      "the north is a sheer cliff face that, unless you are the direct "
      "descendant of a mountain goat, is impassable to you.  To the south "
      "and to the east stretches row after row of golden fruitful grain.  "
      "You see a path leading towards the Newbie Academy parking lot.");
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
	   "east":ROOMS+"wheat01",
	   "southeast":ROOMS+"wheat11",
	   "south":ROOMS+"wheat10",
	   "school":ROOMS+"parking_lot",
      ]) );
}
