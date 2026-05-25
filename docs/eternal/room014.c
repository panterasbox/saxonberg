//  room014.c
#include "/zone/null/eternal/eternal.h"

#define NORTH        "room006"
#define SOUTH        "room018"

#define MAP_SYMBOL "t"
#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Tanelorn Road"
#define DAY_LONG\
  "This is a wide road that has been paved with coarse, black gravel.  " +\
  "Upon closer inspection, you find that the gravel is composed of " +\
  "ground-up obsidian and onyx stones.  Tanelorn Road continues to the " +\
  "north and south."

#define ITEM1 ({ "gravel", "black gravel", "road" })
#define ID1\
  "The black gravel surfacing the road is nothing more than finely crushed " +\
  "black rock."

#define PATROL1  ({"north","south",25})
#define PATROL2  ({"south","south",0})
#define PATROL3  ({"south","south",0})
#define HEART    ({"south","south",6})
 
#include "room.c"
