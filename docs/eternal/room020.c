//  room020.c
#include "/zone/null/eternal/eternal.h"

#define NORTH        "room016"
#define SOUTH        "room028"
#define EAST         "alley9"

#define MAP_SYMBOL "l"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Limbo Lane"
#define DAY_LONG\
  "An odd pink material paves the road you walk on named Limbo Lane.  " +\
  "Each of your steps has a spring in it, as the road pushes and " +\
  "pulls to your every step.  Limbo Lane continues to the north and " +\
  "south; a dark alley can be seen winding through the buildings to " +\
  "to the east."

#define ITEM1 ({ "road", "street", "pavement", "ground", \
                 "pink substance", "odd pink substance", "substance", \
                 "material", "pink material", "odd pink material" })
#define ID1\
  "This is a strange, pink pavement that feels soft underfoot."

#define PATROL1  ({"south","north",11})
#define PATROL2  ({"south","south",0})
#define PATROL3  ({"south","south",0})
#define HEART    ({"south","north",4})
 
#include "room.c"
