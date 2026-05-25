//  room034.c
#include "/zone/null/eternal/eternal.h"

#define NORTH           "room030"
#define SOUTH           "room043"
#define EAST            "room035"

#define MAP_SYMBOL "g"

#define DAY_LIGHT       SUNLIGHT
#define NIGHT_LIGHT     DARK

#define OUTSIDE

#define SHORT           "Glass Way, Intersection"
#define DAY_LONG\
  "You are at the intersection between Glass Way and Eternal Way.  The "+\
  "slippery-smooth surface of this glass road defies your every attempt to "+\
  "secure a foothold in its unyielding pavement.  Glass Way continues to "+\
  "the north and south, and Eternal way lies to the east."

#define PATROL1  ({"north","east",20})
#define PATROL2  ({"east","east",0})
#define PATROL3  ({"north","south",6})
#define HEART    ({"east","south",5})
 
#include "room.c"
