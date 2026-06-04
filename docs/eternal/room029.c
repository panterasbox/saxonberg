//  room029.c
#include "/zone/null/eternal/eternal.h"

#define NORTH        "room021"
#define SOUTH        "room033"

#define MAP_SYMBOL "o"
#define MAP_EXTRA_EAST ({ "V", 0, 0 })

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Old Road"
#define DAY_LONG\
  "You are on a road that has been, over eons, been worn down from a near-" +\
  "infinite amount of traveling upon it.  The uneven surface continues to " +\
  "the north and south.  To the east is a small shop, with a glowing neon "+\
  "sign that reads, 'Videopolis'.  Several signs in its front windows "+\
  "advertise various films and programs."

#define ITEM1 ({ "road", "street", "pavement", "ground" })
#define ID1\
  "This is an old, oft-used road."

#define ITEM2 ({ "ditch", "large ditch", "gouges", "deep gouges", "gouge" })
#define ID2\
  "The ditch has been worn into the road by years and years of heavy traffic."

#define ITEM3 ({ "trails", "footprints", "trails of footprints" })
#define ID3\
  "You can see footprints of all shapes and sizes."

#define ITEM4 ({ "shop", "small shop" })
#define ID4\
  "The building appears to be a video store or something."

#define ITEM5 ({ "sign", "neon sign" })
#define ID5\
  "The sign says, 'Videopolis'."

#include "room.c"
