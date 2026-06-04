//  room001.c

#define EAST    "room002"
#define SOUTH   "room006"
#define WEST    GATE + "gate100"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT       "Tanelorn Road, Bend"
#define DAY_LONG\
  "This is where Tanelorn Road bends in to the south "+\
  "and east directions.  The coarse, gem-like gravel "+\
  "surface is quite deep, and a large pile of unused "+\
  "gravel lies in the corner of this bend.  An immense "+\
  "archway made of huge blocks of stone lies to the west."

#define ITEM1 ({ "gravel", "black gravel", "road" })
#define ID1\
  "The black gravel surfacing the road is nothing more than finely crushed " +\
  "black rock."

#include "room.c"
