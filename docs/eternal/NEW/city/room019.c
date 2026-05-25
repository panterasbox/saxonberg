//  room019.c

#define NORTH        "room015"
#define SOUTH        "common"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Eternal Way"
#define DAY_LONG\
  "This is a wide street traveling through the center of Eternal City.  " +\
  "An eerie mist drifts a few inches above the pavement, unrevealing of " +\
  "the true nature of the road you walk upon.  Eternal Way continues to " +\
  "the north and to the south, into the heart of Eternal City."

#define ITEM1 ({ "road", "street", "pavement", "ground" })
#define ID1\
  "You can't see the road because of the wisps of fog covering it."

#define ITEM2 ({ "fog", "blanket of fog", "mist", "wide mist", "wisps" })
#define ID2\
  "The strange fog covers the road like a delicate, white blanket."

#include "room.c"
