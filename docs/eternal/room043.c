//  room043.c
#include "/zone/null/eternal/eternal.h"

#define NORTH           "room034"
#define SOUTH           "room045"
#define NEWZONE "east" : "/obj/registry/questroom"

#define MAP_SYMBOL "g"
#define MAP_EXTRA_EAST ({ "TE", 0, 0 })
#define DAY_LIGHT       SUNLIGHT
#define NIGHT_LIGHT     DARK

#define OUTSIDE

#define SHORT           "Glass Way"
#define DAY_LONG\
     "You are on the polished surface of a wide, glass road.  Colors "+\
     "of all hues reflect from the surface of the glass as light plays "+\
     "upon it.  A temple of pure glass and white steel of immeasurable "+\
     "splendor can be seen to the east.  Glass way continues to the "+\
     "north and south."

//#define ITEM1           "palace"
//#define ID1\
//     "You know it to be Eotl's Palace of Wizards."
#define ITEM1             "temple"
#define ID1\
       "You know it to be EotL's Temple of Eternity."

#define OBJ1            "/zone/null/eternal/monsters/guard"

#include "room.c"
