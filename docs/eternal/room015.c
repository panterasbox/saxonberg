//  room015.c
#include "/zone/null/eternal/eternal.h"

#define NORTH        "room007"
#define SOUTH        "room019"
#define WEST "tpa/station"

#define MAP_SYMBOL "e"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Eternal Way"
#define DAY_LONG\
  "You are on a road covered beneath a thick blanket of fog.  Something " +\
  "unseen slithers over your lower legs as you wade through the odd " +\
  "stuff.  Eternal Way continues to the north and south." \
  "  The fog thins as it flows west into the TPA Terminal." 

#define ITEM1 ({ "road", "street", "pavement", "ground" })
#define ID1\
  "You can't see the road because of the wisps of fog covering it."

#define ITEM2 ({ "fog", "blanket of fog", "mist", "wide mist", "wisps" })
#define ID2\
  "The strange fog covers the road like a delicate, white blanket."

#define PATROL1  ({"north","north",0})
#define PATROL2  ({"north","south",14})
#define PATROL3  ({"south","south",0})
#define HEART    ({"south","north",2})
 
#include "room.c"
