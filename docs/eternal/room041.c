//  room041.c
#include "/zone/null/eternal/eternal.h"

#define NORTH        "alley5"
#define SOUTH        "alley4"
#define WEST         "room040"
#define EAST         "room042"


#define MAP_SYMBOL "o"
#define MAP_WEST_UNIT 2 
#define MAP_EAST_UNIT 3

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Old Road"
#define DAY_LONG\
  "This is a road that is so ancient that over ages of having been " +\
  "traveled upon, the center of the road has been worn down into a rough " +\
  "trough.  Dark alleys head off through the buildings to the north and " +\
  "south.  Old Road continues to the east and west."

#define ITEM1 ({ "road", "street", "pavement", "ground" })
#define ID1\
  "This is an old, oft-used road."

#define ITEM2 ({ "ditch", "large ditch", "gouges", "deep gouges", "trough" })
#define ID2\
  "The ditch has been worn into the road by years and years of heavy traffic."

#define ITEM3 ({ "alleys", "dark alleys" })
#define ID3\
  "The alleys seem to be alternate (and unsafe) routes around the city."

#define ITEM4 "buildings"
#define ID4\
  "These are simply various city buildings."

#include "room.c"
