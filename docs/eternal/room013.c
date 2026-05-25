//  room013.c
#include "/zone/null/eternal/eternal.h"

#define WEST         "room012"
#define SOUTH        "room017"

#define MAP_SYMBOL "o"
#define MAP_WEST_UNIT 3
#define MAP_EXTRA_EAST ({ "?", 0, 0 })
#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Old Road, Intersection"
#define DAY_LONG\
  "You are at the intersection between Old Road and Silver Street.  The " +\
  "gauges in the road here, upon closer examination, have been augmented " +\
  "with glints of silver.  Silver Street continues to the west, and Old " +\
  "Road is to the south."

#define ITEM1 ({ "silver", "plates", "metal plates", "road", "street", \
                 "pavement", "metal", "gauges" })
#define ID1\
  "The silver-like plates lining the street reverberate with every step " +\
  "you make."

#include "room.c"
