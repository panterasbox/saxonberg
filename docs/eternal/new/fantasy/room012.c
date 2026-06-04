//  room012.c

#define WEST         "room011"
#define EAST         "room013"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Silver Street"
#define DAY_LONG\
  "You are on a wide street that has been paved with a highly polished " +\
  "metal whose mirror-like reflections resemble those of silver.  The " +\
  "road continues to the east and west."

#define ITEM1 ({ "silver", "plates", "metal plates", "road", "street", \
                 "pavement", "metal" })
#define ID1\
  "The silver-like plates lining the street reverberate with every step " +\
  "you make."

#include "room.c"
