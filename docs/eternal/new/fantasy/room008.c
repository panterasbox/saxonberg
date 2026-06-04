//  room008.c

#define NORTH        "bank"
#define EAST         "room009"
#define WEST         "room007"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Silver Street"
#define DAY_LONG\
  "This is a narrow street which has been tiled with metal plates that " \
  "blaze with a light not unlike that of polished silver.  Each of your " \
  "footsteps cause the strange plates to echo with a low-key " \
  "reverberation.  A small building constructed from concrete, looking " \
  "impervious to any assault, lies open to the north.  Silver Street " \
  "continues to the east and west."

#define ITEM1 ({ "silver", "plates", "metal plates", "road", "street", \
                 "pavement", "metal" })
#define ID1\
  "The silver-like plates lining the street reverberate with every step " +\
  "you make."

#define ITEM2 ({ "building", "concrete building" })
#define ID2\
  "The building looks like it could be a bank or something."

#include "room.c"
