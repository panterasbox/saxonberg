//  room004.c
#include "/zone/null/eternal/eternal.h"

#define WEST    "room003"
#define EAST    "room005"

#define MAP_SYMBOL "t"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT       "Tanelorn Road"
#define DAY_LONG\
   "The road here is covered with a layer of black gravel that noisily " +\
   "amplifies your progress along it.  The road continues to the east " +\
   "and west."

#define ITEM1 ({ "gravel", "black gravel", "road" })
#define ID1\
  "The black gravel surfacing the road is nothing more than finely crushed " +\
  "black rock."

#define PATROL1  ({"east","west",4})
#define PATROL2  ({"east","east",0})
#define PATROL3  ({"east","east",0})
#define HEART    ({"east","east",5})
 
#include "room.c"
