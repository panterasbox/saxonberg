/* room032 */
#include "/zone/null/eternal/eternal.h"

#define NORTH   "room027"
#define SOUTH   "room038"

#define MAP_SYMBOL "i"
#define MAP_EXTRA_WEST ({ "A", 0, 0 })

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT       "Infinity Way"
#define DAY_LONG\
    "This is a wide road that has been paved with a dark asphalt mixture.  Two\n"\
    "bright yellow lines in the center of the road divides it into two distinct\n"\
    "portions.  You notice that the travellers on the road tend to stay to their\n"\
    "right.  The road continues to the north and south."

#include "room.c"
