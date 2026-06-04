#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("reset_data", 
      (["duck" : MON+"duck",
        "horse" : MON+"horse" ,
        "cow" : MON+"cow"
      ]) );
   set("short", "At the Eastern Edge of a Fallow Field");
   set( "day_long",
      "The field of tilled, rich soil ends abruptly here at the bank of "
      "a tremendous river.  At first glance, you thought it was an ocean, "
      "until you realized that you could make out the other bank, far, "
      "far in the distance.  To the north, you can see a looming cliff "
      "face that stretches to the bank of the river.  The fallow field "
      "continues to the south and west.");
   set("descs", ([
	   ({ "cliff", "face", "cliff face" }) :
	      "This cliff face goes straight up for about 300 feet and then "
	      "gradually inclines to form huge, sky-piercing peaks of "
	      "granite.  As you incline your head to look at the cliff, high "
	      "in the sky you see something floating along up there.  It's not "
	      "a bird, it's not a star...  What could it be?",
	   ({"soil","tilled soil","black soil","dirt"}) :
	      "This rich, warm soil has been plowed, but left unseeded to "
	      "increase its growth potential in the next season.",
      ({"river","river bank","bank"}) :
         "This swollen, rapidly flowing river looks frightening difficult "
         "to cross.  In fact, you can see no craft or bridge of any sort "
         "in your vision.",
      ]) );
   set(OutsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", ([
	   "north":ROOMS+"wheat09",
	   "northwest":ROOMS+"wheat08",
	   "west":ROOMS+"wheat18",
	   "south":ROOMS+"wheat29",
	   "southwest":ROOMS+"wheat28",
      ]) );
}
