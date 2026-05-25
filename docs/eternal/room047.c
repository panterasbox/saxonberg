//  room047.c
#include "/zone/null/eternal/eternal.h"

#define NORTH   "room045"
#define EAST    "room048"

#define MAP_SYMBOL "g"
#define MAP_EXTRA_WEST ({ "?", 0, 0 })
#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT       "Glass Way, Intersection"
#define DAY_LONG\
    "This is the intersection between Glass Way and Dimension Drive.  "+\
    "The unusually plain gravel pavement of Dimension Drive continues "+\
    "to the east and the spectacular surface of Glass Way leads off to "+\
    "the north.  "

#include "room.c"
