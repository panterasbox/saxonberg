#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("reset_data", 
      (["cow" : MON+"cow",
        "cow2" : MON+"cow",
        "cow3" : MON+"cow"
      ]) );
   set("short","On the Northern Edge of a Vast Field of Wheat");
   set( "day_long",
      "Here at the edge of the vast field of wheat, you've come upon a "
      "tremendous cliff of solid granite.  The huge expanse of rock "
      "precludes any possible travel further to the north.  The wheat "
      "field continues on in all other directions.");
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
	   "west":ROOMS+"wheat03",
	   "east":ROOMS+"wheat05",
	   "south":ROOMS+"wheat14",
	   "southeast":ROOMS+"wheat15",
	   "southwest":ROOMS+"wheat13",
      ]) );
}
