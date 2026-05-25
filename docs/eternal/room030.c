//  room030.c

#define NORTH           "room023"
#define SOUTH           "room034"
/*
#define EAST            "tailor_shop"
*/

#define MAP_SYMBOL "g"

#define DAY_LIGHT       SUNLIGHT
#define NIGHT_LIGHT     DARK

#define OUTSIDE

#define SHORT           "Glass Way"
#define DAY_LONG\
  "This is a wide road whose surface has been paved with a thick, " +\
  "slick, and greenish-tinted pane of glass.  You can't help but slip " +\
  "and fall on your rear, as obtaining any kind of grip on the " +\
  "slippery surface appears to be next to impossible.  " +\
  "A modest building built out of brick can be seen to the east, but it  " +\
  "seems to have fallen into disrepair long ago.  " +\
  "Glass Way continues to the south, Limbo Lane to the north."

#define PATROL1  ({"north","south",21})
#define PATROL2  ({"north","north",0})
#define PATROL3  ({"north","south",7})
#define HEART    ({"north","south",4})
 
#include "room.c"
