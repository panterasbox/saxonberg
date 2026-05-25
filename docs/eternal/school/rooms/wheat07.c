#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("short","On the Northern Edge of a Fallow Field");
   set( "day_long",
      "You are standing in an open area of black, tilled soil.  To the "
      "south and east, the exposed earth continues.  To the west, you see "
      "row after row of tall, golden wheat stretching off into the "
      "distance.  To the north, you are faced with an impassable granite "
      "cliff that stretches to the east and west.");
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
	      "a bird, it's not a star...  What could it be?",
	   ({"soil","tilled soil","black soil","dirt"}) :
	      "This rich, warm soil has been plowed, but left unseeded to "
	      "increase its growth potential in the next season."
      ]) );
   set(OutsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", ([
	   "west":ROOMS+"wheat06",
	   "east":ROOMS+"wheat08",
	   "south":ROOMS+"wheat17",
	   "southeast":ROOMS+"wheat18",
	   "southwest":ROOMS+"wheat16",
      ]) );
}
