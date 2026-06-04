//  room010.c

#define WEST         "room009"
#define EAST         "room011"
#define SOUTH        "room016"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Silver Street, Intersection"
#define DAY_LONG\
  "This is the intersection between Silver Street and Limbo Lane.  The " +\
  "road here glitters with the common sheen of Silver Street.  The pink " +\
  "pavement of Limbo Lane can be seen leading off to the south.  Silver " +\
  "Street continues to the east and west."

#define ITEM1 ({ "silver", "plates", "metal plates", "road", "street", \
                 "pavement" })
#define ID1\
  "The silver-like plates lining the street reverberate with every step " +\
  "you make."

#define OBJ1         "/zone/null/eternal/monsters/guard"

#include "room.c"
