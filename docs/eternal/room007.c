//  room007.c
#include "/zone/null/eternal/eternal.h"

#define NORTH        "room005"
#define SOUTH        "room015"
#define EAST         "room008"
#define WEST         "bbinn1"

#define MAP_SYMBOL "e"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Eternal Way, Intersection"
#define DAY_LONG\
  "You are at the intersection between Eternal Way and Silver Street.  " + \
  "A light mist floats above the ground, obscuring the true nature of " + \
  "the road you walk upon.  A large building made of ornately decorated " + \
  "stone lies open to the west.  Eternal Way continues to the north and " + \
  "south, with Silver Street to the east."

#define PATROL1  ({"east","north",6})
#define PATROL2  ({"east","south",15})
#define PATROL3  ({"south","south",0})
#define HEART    ({"south","north",3})
 
#include "room.c"
