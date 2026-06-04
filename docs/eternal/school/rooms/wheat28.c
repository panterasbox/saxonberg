#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("short","In a Fallow Field");
   set( "day_long",
      "You're leaving deep footprints in the rich soil of these "
      "freshly tilled furrows.  It looks as if this area of the "
      "wheatfield is being left fallow.  The rows of tilled earth "
      "stretch out as far as you can see to the south.  To the north, "
      "in the distance, you can see a looming cliff face.  To the west, "
      "also in the distance, you can see rows of wheat.");
   set("descs", ([
	   ({ "grain","row","rows", "wheat" }) :
	      "This grain is rich and plentiful.  It has taken root in the "
	      "warm black soil that makes up this sheltered plain.  The "
	      "stalks of grain line up in careful rows as far as your eye "
	      "can see.",
	   ({ "cliff", "face", "cliff face" }) :
	      "This cliff face goes straight up for about 300 feet and then "
	      "gradually inclines to form huge, sky-piercing peaks of granite. "
	      " As you incline your head to look at the cliff, high in the sky "
	      "you see something floating along up there.  It's not a bird, it's "
	      "not a star...  What could it be?",
	   ({"soil","tilled soil","black soil","dirt"}) :
	      "This rich, warm soil has been plowed, but left unseeded to "
	      "increase its growth potential in the next season.",
      ]) );
   set(OutsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", ([
	   "north":ROOMS+"wheat18",
	   "northeast":ROOMS+"wheat19",
	   "northwest":ROOMS+"wheat17",
	   "west":ROOMS+"wheat27",
	   "east":ROOMS+"wheat29",
      ]) );
}
