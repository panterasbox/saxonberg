//  room017.c
#include "/zone/null/eternal/eternal.h"

#define NORTH        "room013"
#define SOUTH        "room021"
#define WEST         "shop1"

#define MAP_SYMBOL "o"
#define MAP_WEST_UNIT 2
#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Old Road"
#define DAY_LONG\
  "This is a road that has been heavily trodden upon since the beginning " +\
  "of time.  A large ditch has been carved into the center of this road " +\
  "by erosion and general wear-and-tear.  A large sign over a white " +\
  "warehouse to the west reads, 'Everything Inc.'.  Old Road continues " +\
  "to the north and south."

#define ITEM1 ({ "road", "street", "pavement", "ground" })
#define ID1\
  "This is an old, oft-used road."

#define ITEM2 ({ "warehouse", "white warehouse" })
#define ID2\
  "The building appears to be some sort of \"Price Club\"-type store."

#define ITEM3 "sign"
#define ID3\
  "The sign says, 'Everything Inc.'."

#define ITEM4 ({ "ditch", "large ditch" })
#define ID4\
  "The ditch has been worn into the road by years and years of heavy traffic."

#include "room.c"
