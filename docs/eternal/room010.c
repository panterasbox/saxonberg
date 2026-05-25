//  room010.c
#include "/zone/null/eternal/eternal.h"

#define WEST         "room009"
#define EAST         "room011"
#define SOUTH        "room016"

#define MAP_SYMBOL "s"
#define MAP_EAST_UNIT 2

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

#define PATROL1  ({"south","west",9})
#define PATROL2  ({"east","west",18})
#define PATROL3  ({"south","south",0})
#define HEART    ({"west","east",6})
 
#include "room.c"
