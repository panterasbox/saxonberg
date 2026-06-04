//  room005.c

#define WEST         "room004"
#define SOUTH        "room007"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT       "Eternal Way, Bend"
#define DAY_LONG\
  "The road here is covered with a layer of black gravel that noisily " +\
  "amplifies your progress along it.  Tanelorn road continues west and " +\
  "Eternal Road south."

#define ITEM1 ({ "gravel", "black gravel", "road" })
#define ID1\
  "The black gravel surfacing the road is nothing more than finely crushed " +\
  "black rock."

#include "room.c"
