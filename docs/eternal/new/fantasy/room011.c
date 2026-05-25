//  room011.c

#define WEST         "room010"
#define EAST         "room012"
#define NORTH        "shop2"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Silver Street"
#define DAY_LONG\
  "The metal tiles of this unique road glow with a silver sheen as the " +\
  "light plays upon it.  A small, squat building to the north has a sign " +\
  "in front of it with the words 'PC&A' written across it.  Silver Street " +\
  "continues to the east and west."

#define ITEM1 ({ "silver", "plates", "metal plates", "road", "street", \
                 "pavement", "metal" })
#define ID1\
  "The silver-like plates lining the street reverberate with every step " +\
  "you make."

#define ITEM2 ({ "building", "squat building" })
#define ID2\
  "The building appears to be a clothing store or something."

#define ITEM3 "sign"
#define ID3\
  "The sign says, 'PC&A'."

#include "room.c"
