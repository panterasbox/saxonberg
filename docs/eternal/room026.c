
#include "/zone/null/eternal/eternal.h"
#define WEST "common"
#define EAST "room027"

#define MAP_SYMBOL "l"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT    "Limbo Courtyard"
#define DAY_LONG\
   "This is a wide courtyard that has been paved with an unusual pink "\
   "substance that squishes under your every footstep.  Limbo Lane continues "\
   "to the east and west, the latter leading into the heart of Eternal City."

#define PATROL1  ({"west","east",14})
#define PATROL2  ({"west","east",11})
#define PATROL3  ({"east","west",12})
#define HEART    ({"west","east",1})
 
#include "room.c"
