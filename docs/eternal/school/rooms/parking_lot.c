#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
    set("short","The EotL Newbie Academy Parking Lot");
    set("day_long",
      "This is the paved parking lot in front of the EotL "
      "Newbie Academy where before and after classes, the big "
      "yellow balloons land gently and bring all the happy "
      "students home to afternoon cartoons and nappy-times.  "
      "The academy stands to your north and a busy road "
      "runs past the school and around the lot.  There is "
      "a path here that leads to the Newbie Academy Farm. "
    );
    set("day_light", 80);
    set(OutsideP, 1);
    set(NoPKP, 1);
    set(NoTeleportInP, 1);
    set("exits", ([
	"north":ROOMS+"entrance",
	"farm":ROOMS+"wheat00",
	"road":ROOMS+"road",
      ]) );
    set("descs", ([
	({"lot","parking lot"}):
	"This lot is paved with black asphalt and lined with yellow "
	"paint.  There are no cars parked in the lot at this time.  "
	"In fact, there is no sign that a car was ever in the lot to "
	"begin with.",
	({"road","busy road"}):
	"This road runs around the perimeter of the parking lot and "
	"past the school.  Traffic rushes by at an alarming speed.  ",
	"traffic":
	"The cars and trucks here seem to roar by with little regard "
	"for the safety of pedestrians.  You notice several people "
	"reading and applying makeup as they cruise by.",
	({"school", "EotL school", "EOTL School", "School", "academy", "Academy", 
	   "Newbie Academy", "newbie academy"}):
	"The academy is a tall, wood building.  It's been painted "
	"red and here and there you see that it has begun to peel.  "
	"Through a window, you can see that the interior looks "
	"warm and dry, a great atmosphere for academics.",
      ]) );
    set("reset_data",
      ([
	"roy":MON+"roy",
      ]) );
}

query_leave_ok()
{
   object who;
   who = THISP;
   
   if(present_path(MON+"roy") && query_verb()=="road"){
	present_path(MON+"roy")->do_save(who);
	return 1;
    }

}

string exit_message(string dir)
{
    if(dir=="road")
	return( "towards the "+dir);
    else return(dir);
}
