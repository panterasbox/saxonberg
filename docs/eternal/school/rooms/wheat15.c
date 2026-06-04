#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("short","Somewhere in a Vast Field of Wheat");
   set( "day_long",
      "If you like wheat, this is the place to be.  All around you "
      "stretch rows and rows of golden wheat.  This is the stuff bread "
      "is made of.  Visions of scythes and sheaves run through your "
      "mind.  Off to the north, you can see a dull cliff face stretching "
      "into the sky.");
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
	   "north":ROOMS+"wheat05",
	   "northwest":ROOMS+"wheat04",
	   "northeast":ROOMS+"wheat06",
	   "west":ROOMS+"wheat14",
	   "east":ROOMS+"wheat16",
	   "south":ROOMS+"wheat25",
	   "southeast":ROOMS+"wheat26",
	   "southwest":ROOMS+"wheat24",
      ]) );
}
