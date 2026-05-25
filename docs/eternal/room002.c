//  room002.c
#include "/zone/null/eternal/eternal.h"

#define WEST    "room001"
#define EAST    "room003"

#define MAP_SYMBOL "t"
#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT       "Tanelorn Road"
#define DAY_LONG\
  "You are on a road covered with a thick layer of coarse, black " +\
  "gravel.  The road continues to the east and can be seen " +\
  "turning southward to the west."

#define ITEM1 ({ "gravel", "black gravel", "road" })
#define ID1\
  "The black gravel surfacing the road is nothing more than finely crushed " +\
  "black rock."

#define PATROL1  ({"east","west",2})
#define PATROL2  ({"east","east",0})
#define PATROL3  ({"west","west",0})
#define HEART    ({"east","east",7})
 
#include "room.c"
