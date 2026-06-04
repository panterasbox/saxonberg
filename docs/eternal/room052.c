//  room052.c
#include "/zone/null/eternal/eternal.h"

#define NEWZONE "east" : "/zone/fantasy/naromaar/rooms/entry_path1"
#define NORTH   "room046"
#define WEST    "room051"
#define SOUTH "evil/throne_room"

#define MAP_SYMBOL "i"
#define MAP_EXTRA_EAST ({ "?", 0, 0 })

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

#include "room.c"
