
#include "/zone/null/eternal/eternal.h"
#define EAST "common"
#define SOUTH "library"
#define WEST "room024"

#define MAP_SYMBOL "l"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT     "Limbo Courtyard"
#define DAY_LONG\
   "You are on a road paved with a strange pink material.  "\
   "The material compresses like cotton candy under your feet, while "\
   "above you is the balcony of the Eternal City Library. "\
   " Limbo Lane continues to the east into the heart of Eternal City, "\
   "and to the west as well."

#define PATROL1  ({"east","east",0})
#define PATROL2  ({"east","east",0})
#define PATROL3  ({"east","west",10})
#define HEART    ({"east","west",1})
 
#include "room.c"
