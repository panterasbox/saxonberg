#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("reset_data", 
      (["rooster" : MON+"rooster",
        "hen" : MON+"hen",
        "hen2" : MON+"hen",
        "hen3" : MON+"hen"
      ]) );
   set("short","Somewhere in a Vast Field of Wheat");
   set( "day_long",
      "You're in the middle of what seems to be an endless wheatfield.  "
      "Off in the distance to the north, there is a huge cliff face, but "
      "otherwise the rows of golden wheat stretch out as far as you "
      "can see.  It's sort of idyllic, really.");
   set("descs", ([
	   ({ "grain","row","rows", "wheat" }) :
	      "This grain is rich and plentiful.  It has taken root in the warm "
	      "black soil that makes up this sheltered plain.  The stalks of "
	      "grain line up in careful rows as far as your eye can see.",
	   ({ "cliff", "face", "cliff face" }) :
	      "The cliff is in the distance and appears to be very tall.  You "
	      "can't tell much from this vantage point, but it doesn't look "
	      "like there would be an easy way up.",
      ]) );
   set(OutsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", ([
	   "north":ROOMS+"wheat03",
	   "northwest":ROOMS+"wheat02",
	   "northeast":ROOMS+"wheat04",
	   "west":ROOMS+"wheat12",
	   "east":ROOMS+"wheat14",
	   "south":ROOMS+"wheat23",
	   "southeast":ROOMS+"wheat24",
	   "southwest":ROOMS+"wheat22",
      ]) );
}
