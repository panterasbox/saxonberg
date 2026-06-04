//  room023.c
#include "/zone/null/eternal/eternal.h"

#define WEST            "room022"
#define EAST            "room024"
#define SOUTH           "room030"

#define MAP_SYMBOL "l"

#define DAY_LIGHT       SUNLIGHT
#define NIGHT_LIGHT     DARK

#define OUTSIDE

#define SHORT           "Limbo Lane, Intersection"
#define DAY_LONG\
  "This is the intersection between Limbo Lane and Glass Way.  An odd, pink "+\
  "pavement sinks beneath your footsteps here.  Limbo Lane continues to the "+\
  "east and west, with Glass Way to the south."

#define PATROL1  ({"west","south",22})
#define PATROL2  ({"east","east",0})
#define PATROL3  ({"east","south",8})
#define HEART    ({"east","west",3})
 
#include "room.c"
