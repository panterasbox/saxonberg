/* room028 */
#include "/zone/null/eternal/eternal.h"

#define NORTH   "room020"
#define WEST    "room027"

#define MAP_SYMBOL "l"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT       "Limbo Lane, Bend"
#define DAY_LONG\
  "This is where Limbo Lane turns from an east-west to a north-south "\
  "direction.  Everywhere, an unusual pink, spongy material covers the " \
  "road that leads off to the north and west."

#define PATROL1  ({"west","north",12})
#define PATROL2  ({"west","west",0})
#define PATROL3  ({"west","west",0})
#define HEART    ({"west","north",3})
 
#include "room.c"
