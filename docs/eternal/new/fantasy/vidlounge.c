#include "/zone/null/cabaltv/TV.h"
#define TV TVDIR+"/TV"
#define TVGUIDE TVDIR+"/guide/TVGuide"
inherit RoomCode;

#define SHORT	"Video Lounge"

#define DAY_LONG  "This small room is comfortably furnished with several"+\
"padded chairs, a coffee table, and, of course, a very large "+\
"color television set.  All in all, it seems like a rather "+\
"comfortable place to settle in for some serious viewing."

#define DAY_LIGHT	WELL_LIT

#define NORTH "videoshop"

extra_create()
	{
	set("short", SHORT);
	set("day_long", DAY_LONG);
	set("day_light", DAY_LIGHT);
	set(InsideP,1);
	set("exits", ([ "north":NORTH ]) );
	move_object(clone_object(TV), THISO);
	}

extra_reset()
	{
	int i;

	if(!present("tvguide", THISO))
	for(i=random(3); i>0; i--)
	  move_object(clone_object(TVGUIDE), THISO);
	}
