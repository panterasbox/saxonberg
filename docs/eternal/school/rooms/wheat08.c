#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("reset_data", 
      (["duck" : MON+"duck",
        "rooster" : MON+"rooster",
        "hen" : MON+"hen"
      ]) );
   set("short","On the Northern Edge of a Fallow Field");
   set( "day_long",
      "Immediately to your north stands an immense wall of solid "
      "granite.  This cliff face stretches as far as you can see to the "
      "east and west and prohibits any further travel to the north.  All "
      "around you are furrows of unseeded soil.  The soil is warm and "
      "moist and you can see your tracks trailing behind you.  The open "
      "field continues in all directions.");
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
	   "west":ROOMS+"wheat07",
	   "east":ROOMS+"wheat09",
	   "south":ROOMS+"wheat18",
	   "southeast":ROOMS+"wheat19",
	   "southwest":ROOMS+"wheat17",
      ]) );
}
