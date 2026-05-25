//  room002.c

#define WEST    "room001"
#define EAST    "room003"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT       "Tanelorn Road"
#define DAY_LONG\
  "You are on a road covered with a thick layer of coarse, black " +\
  "gravel, and walled on both sides with unimpressive rows of buildings.  "+\
  "The road continues to the east and can be seen turning southward to " + \
  "the west."

#define ITEM1 ({ "gravel", "black gravel", "road" })
#define ID1\
  "The black gravel surfacing the road is nothing more than finely crushed " +\
  "black rock."

#include "room.c"
