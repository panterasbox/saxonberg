//  room019.c
#include "/zone/null/eternal/eternal.h"
 
#define NORTH        "room015"
#define SOUTH        "common"
#define EAST "garage"
 
#define MAP_SYMBOL "e"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK
 
#define OUTSIDE
 
#define SHORT        "Eternal Way"
#define DAY_LONG\
  "This is a wide street traveling through the center of " \
  "Eternal City.  An eerie mist drifts a few inches above " \
  "the pavement, refraining from revealing the true nature " \
  "of the road you walk upon.  Eternal Way continues to " \
  "the north and to the south, into the heart of Eternal " \
  "City.  To the east stands a squarish building, with " \
  "several large openings in its face.  A sign hanging over " \
  "the middle door identifies it as the Public Garage.  "\
 
#define ITEM1 ({ "road", "street", "pavement", "ground" })
#define ID1\
  "You can't see the road because of the wisps of fog covering it."
 
#define ITEM2 ({ "fog", "blanket of fog", "mist", "wide mist", "wisps" })
#define ID2\
  "The strange fog covers the road like a delicate, white " \
  "blanket, and yet your best attempts to fan the fog away " \
  "from the surface of the road only serves to stir the fog " \
  "sluggishly."
 
#define PATROL1  ({"south","south",0})
#define PATROL2  ({"north","south",13})
#define PATROL3  ({"south","south",0})
#define HEART    ({"south","north",1})
 
#include "room.c"
