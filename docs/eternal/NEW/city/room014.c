//  room014.c

#define NORTH        "room006"
#define SOUTH        "room018"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Tanelorn Road"
#define DAY_LONG\
  "This is a wide road that has been paved with a coarse, black gravel.  " +\
  "Upon closer inspection, you find that the gravel is composed of " +\
  "ground-up obsidian and oynx stones.  Tanelorn Road continues to the " +\
  "north and south."

#define ITEM1 ({ "gravel", "black gravel", "road" })
#define ID1\
  "The black gravel surfacing the road is nothing more than finely crushed " +\
  "black rock."

#include "room.c"
