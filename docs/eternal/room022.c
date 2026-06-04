//  room022.c
#include "/zone/null/eternal/eternal.h"

#define SOUTH           "stat_room1"
#define EAST            "room023"
#define NORTH           "room018"

#define MAP_SYMBOL "l"
#define MAP_EXTRA_WEST ({ "?", 0, 0 })

#define DAY_LIGHT       SUNLIGHT
#define NIGHT_LIGHT     DARK

#define OUTSIDE

#define SHORT           "Limbo Lane, Intersection"
#define DAY_LONG\
  "You stand at the intersection of Limbo Lane and Tanelorn Road.  The " +\
  "road has been paved with a soft, spongy pink material.  An elaborate " +\
  "structure constructed from blocks of white marble, carved in a gothic " +\
  "fashion, lies to the south.  Limbo Lane continues to the east, with " +\
  "Tanelorn Road to the north."

#define PATROL1  ({"north","east",23})
#define PATROL2  ({"east","east",0})
#define PATROL3  ({"east","east",0})
#define HEART    ({"east","west",4})
 
#include "room.c"
