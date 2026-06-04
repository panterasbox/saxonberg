//  room003.c
#include "/zone/null/eternal/eternal.h"

#define WEST    "room002"
#define EAST    "room004"

#define MAP_SYMBOL "t"
#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT       "Tanelorn Road"
#define DAY_LONG\
   "This is a road traversing the northwest quarter of Eternal City " +\
   "in an east and west direction.  The surface of this road is covered " +\
   "with a shiny, black gravel that crunches under each of your steps."

#define ITEM1 ({ "gravel", "black gravel", "road" })
#define ID1\
  "The black gravel surfacing the road is nothing more than finely crushed " +\
  "black rock."
#define OBJ1 "/zone/future/emetic/my_citadel/my_obj/rift2.c"

#define PATROL1  ({"east","west",3})
#define PATROL2  ({"east","east",0})
#define PATROL3  ({"east","east",0})
#define HEART    ({"east","east",6})
 
#include "room.c"
