#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("short","Somewhere in a Vast Field of Wheat");
   set( "day_long",
      "Off in the distance to the north, you can make out a solid cliff "
      "face, but otherwise you are surrounded by row after row of "
      "beautiful, amber waves of grain.  While pleasing to your senses, "
      "it is a bit vexing in terms of navigation.");
   set("descs", ([
	   ({ "grain","row","rows", "wheat" }) :
	      "This grain is rich and plentiful.  It has taken root in the "
	      "warm black soil that makes up this sheltered plain.  The "
	      "stalks of grain line up in careful rows as far as your eye "
	      "can see.",
	   ({ "cliff", "face", "cliff face" }) :
	      "The cliff is in the distance and appears to be very tall.  You "
	      "can't tell much from this vantage point, but it doesn't look "
	      "like there would be an easy way up.",
      ]) );
   set(OutsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", ([
	   "north":ROOMS+"wheat14",
	   "northwest":ROOMS+"wheat13",
	   "northeast":ROOMS+"wheat15",
	   "west":ROOMS+"wheat23",
	   "east":ROOMS+"wheat25",
      ]) );
}
