//  room052.c

#define NORTH   "room046"
#define WEST    "room051"
#define SOUTH   "evil/throne_room"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT       "Infinity Way, Intersection"
#define DAY_LONG\
    "You are at the intersection between Infinity Way and Dimension " +\
    "Drive.  The dark pavement's dual yellow lines continues to the north " +\
    "and a narrow dirt track continues to the east.\n" +\
    "   To the south is a very large building.  It looks like a throne " +\
    "room of some sort."

#define OBJ1 "/zone/null/eternal/monsters/guard"

// Commenting out Ragnarok from the room so that
// an entry object can be used instead.
//#define NEWZONE "east" : "/zone/fantasy/ragnarok/entry/room053"

#include "room.c"

/*
extra_reset() {
if(exists(CABALS+"ragnarok.approved"))
   add_exit("east", "/zone/fantasy/ragnarok/entry/room053.c");
	if(!mon0)
	   {
	   mon0=clone_object("/zone/null/eternal/monsters/guard");
	   move_object(mon0, THISO);
	   }
}
*/
