//  room003.c

#define WEST    "room002"
#define EAST    "room004"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT       "Tanelorn Road"
#define DAY_LONG\
   "This is a road traversing the northwest quarter of Eternal City " +\
   "in an east and west direction.  The surface of this road is covered " +\
   "with a shiny, black gravel that crunches under each of your steps.  "+\
   "High above, the Shield ripples lazily."

#define ITEM1 ({ "gravel", "black gravel", "road" })
#define ID1\
  "The black gravel surfacing the road is nothing more than finely crushed " +\
  "black rock."

#include "room.c"
