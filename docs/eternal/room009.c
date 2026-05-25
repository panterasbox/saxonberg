//  room009.c
#include "/zone/null/eternal/eternal.h"

#define WEST         "room008"
#define EAST         "room010"

#define MAP_SYMBOL "s"

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

#define PATROL1  ({"east","west",8})
#define PATROL2  ({"east","west",17})
#define PATROL3  ({"west","west",0})
#define HEART    ({"west","west",5})
 
#include "room.c"
