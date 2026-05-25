#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("reset_data", 
      (["cow" : MON+"cow",
        "bull" : MON+"bull" 
      ]) );
   set("short","Somewhere in a Vast Field of Wheat");
   set( "day_long",
      "You are standing amid seemingly thousands of rows of wheat that "
      "stretch without end to the horizon.  To the north, however, they "
      "stretch until they hit a large cliff face that looms above the "
      "field.");
    set("descs", ([
	   ({ "grain","row","rows", "wheat" }) :
	      "This grain is rich and plentiful.  It has taken root in the "
	      "warm black soil that makes up this sheltered plain.  The stalks "
	      "of grain line up in careful rows as far as your eye can see.",
	   ({ "cliff", "face", "cliff face" }) :
	      "The cliff is in the distance and appears to be very tall.  You "
	      "can't tell much from this vantage point, but it doesn't look "
	      "like there would be an easy way up.",
      ]) );
   set(OutsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", ([
	   "north":ROOMS+"wheat06",
	   "northwest":ROOMS+"wheat05",
	   "northeast":ROOMS+"wheat07",
	   "west":ROOMS+"wheat15",
	   "east":ROOMS+"wheat17",
	   "south":ROOMS+"wheat26",
	   "southeast":ROOMS+"wheat27",
	   "southwest":ROOMS+"wheat25",
      ]) );
}
