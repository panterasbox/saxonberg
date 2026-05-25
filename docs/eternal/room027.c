/* room027 */
#include "/zone/null/eternal/eternal.h"
#define EAST    "room028"
#define WEST    "room026"
#define SOUTH   "room032"

#define MAP_SYMBOL "l"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT       "Limbo Lane, Intersection"
#define DAY_LONG\
"You are at the intersection between Limbo Lane and Infinity Way.  The road "\
"here is paved in an odd, pinkish material that compresses under your weight.  "\
"Limbo Lane continues to the east and west, Infinity Way to the south."

#define PATROL1  ({"west","east",13})
#define PATROL2  ({"west","south",10})
#define PATROL3  ({"south","west",13})
#define HEART    ({"west","south",2})
 
#include "room.c"
