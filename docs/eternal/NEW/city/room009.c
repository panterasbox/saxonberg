//  room009.c

#define WEST         "room008"
#define EAST         "room010"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Silver Street"
#define DAY_LONG\
  "You are on a widely paved street that continues to the east and " +\
  "west.  Beneath you, the pavement glitters from an unknown " +\
  "substance.  Every step you take rings off of its surface and is " +\
  "lost in the city's atmosphere."

#define ITEM1 ({ "silver", "plates", "metal plates", "road", "street", \
                 "pavement" })
#define ID1\
  "The silver-like plates lining the street reverberate with every step " +\
  "you make."

#include "room.c"
