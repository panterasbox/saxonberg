//  room015.c

#define NORTH        "room007"
#define SOUTH        "room019"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Eternal Way"
#define DAY_LONG\
  "You are on a road covered beneath a thick blanket of fog.  Something " +\
  "unseen slithers over your lower legs as you wade through the odd " +\
  "stuff.  Eternal Way continues to the north and south."

#define ITEM1 ({ "road", "street", "pavement", "ground" })
#define ID1\
  "You can't see the road because of the wisps of fog covering it."

#define ITEM2 ({ "fog", "blanket of fog", "mist", "wide mist", "wisps" })
#define ID2\
  "The strange fog covers the road like a delicate, white blanket."

#include "room.c"
