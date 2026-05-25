/* room031 */
#include "/zone/null/eternal/eternal.h"

#define NEWZONE "north" : "/zone/null/eternal/common"
#define SOUTH "room037"

#define MAP_SYMBOL "e"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT       "Eternal Way"
#define DAY_LONG\
    "You are on a wide, heavily used road, traversing through the center of " \
    "this glorious city.  Some strange wisps of fog or smoke swirl a few " \
    "inches above the street, obscuring its construction.  Eternal Way " \
    "continues to the north into the heart of Eternal City, and south."

#define PATROL1  ({"south","north",16})
#define PATROL2  ({"north","north",0})
#define PATROL3  ({"north","north",0})
#define HEART    ({"north","south",1})
 
#include "room.c"
