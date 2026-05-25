//  room005.c

#define WEST         "room004"
#define SOUTH        "room007"
#define NORTH       "gate200"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT       "Eternal Way, Bend"
#define DAY_LONG\
  "The road here is covered with a light sprinkling of black gravel " + \
  "that mixes with a low mist.  To the north lies a large, open archway.  "+\
  "Tanelorn Road continues to the west, and Eternal Way to the south."

#define ITEM1 ({ "gravel", "black gravel", "road" })
#define ID1\
  "The black gravel surfacing the road is nothing more than finely crushed " +\
  "black rock."

#include "room.c"
