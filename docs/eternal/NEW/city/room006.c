//  room006.c

#define NORTH        "room001"
#define SOUTH        "room014"
#define EAST         "bodyshop"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Tanelorn Road"
#define DAY_LONG\
  "You are on a road covered with black gravel.  A shady dwelling built " +\
  "from old wood, nailed together in a random fashion, lies through an " +\
  "open doorway to the east.  Tanelorn Road continues to the north and south."

#define ITEM1 ({ "gravel", "black gravel", "road" })
#define ID1\
  "The black gravel surfacing the road is nothing more than finely crushed " +\
  "black rock."

#define ITEM2 ({ "dwelling", "shady dwelling", "doorway", "door" })
#define ID2\
  "This appears to be the entrance to Dr. Frankenstein's Body Shop!"

#define OBJ1         "/zone/null/eternal/monsters/guard"

#include "room.c"
