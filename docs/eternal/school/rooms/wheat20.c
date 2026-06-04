#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("short","On the Western Edge of a Vast Field of Wheat");
   set( "day_long",
      "You are standing at the western edge of an incredibly large field "
      "of wheat. South of here is a vast nothingness.  Your mind "
      "cannot comprehend the blackness hanging to your south.  You see "
      "a faint path to the west, and wheat surrounds you to the north and "
      "east.");
   set("descs", ([
	   ({ "grain","row","rows", "wheat" }) :
   	   "This grain is rich and plentiful.  It has taken root in the "
   	   "warm black soil that makes up this sheltered plain.  The "
   	   "stalks of grain line up in careful rows as far as your eye can "
   	   "see.",
	   ({"blackness","abyss"}) :
	      "You peer into the darkness, but you can see nothing more but "
	      "utter nothingness.  Not even the sound of your voice can "
	      "penetrate the complete lack of anything.",
      ]) );
   set(OutsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", ([
	   "north":ROOMS+"wheat10",
	   "east":ROOMS+"wheat21",
	   "west":ROOMS+"path",
	   "northeast":ROOMS+"wheat11",
      ]) );
}
