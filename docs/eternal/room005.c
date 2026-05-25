//  room005.c
 
#include "/zone/null/eternal/eternal.h"

#define WEST         "room004"
#define SOUTH        "room007"

#define MAP_SYMBOL "e"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT       "Eternal Way, Bend"
#define DAY_LONG\
  "The road here is covered with a layer of black gravel that noisily " +\
  "amplifies your progress along it.  Tanelorn road continues west and " +\
  "Eternal Road south."

#define ITEM1 ({ "gravel", "black gravel", "road" })
#define ID1\
  "The black gravel surfacing the road is nothing more than finely crushed " +\
  "black rock."

#define PATROL1  ({"south","west",5})
#define PATROL2  ({"south","south",0})
#define PATROL3  ({"south","south",0})
#define HEART    ({"south","north",4})
 
#include "room.c"
