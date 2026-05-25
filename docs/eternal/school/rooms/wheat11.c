#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("reset_data", 
      (["sheep" : MON+"sheep",
        "sheep2" : MON+"sheep",
        "sheep3" : MON+"sheep",
        "pig" : MON+"pig" 
      ]) );
   set("short","Somewhere in a Vast Field of Wheat");
   set( "day_long",
      "You are standing in an immense field of wheat.  To the south and "
      "east, the rows of wheat stretch out as far as you can see.  To the "
      "north, in the distance, you can see what appears to be a cliff face "
      "cutting off the field.  To the west, it seems as if the wheat "
      "tapers off somehow.");
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
   set(OutsideP,1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", ([
	   "north":ROOMS+"wheat01",
	   "northwest":ROOMS+"wheat00",
	   "northeast":ROOMS+"wheat02",
	   "west":ROOMS+"wheat10",
	   "east":ROOMS+"wheat12",
	   "south":ROOMS+"wheat21",
	   "southeast":ROOMS+"wheat22",
	   "southwest":ROOMS+"wheat20",
      ]) );
}
