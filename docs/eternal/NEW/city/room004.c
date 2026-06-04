//  room004.c

#define WEST    "room003"
#define EAST    "room005"

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

#include "room.c"
