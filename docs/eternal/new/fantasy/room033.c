//  room033.c

#define NORTH        "room029"
#define SOUTH        "room042"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Old Road"
#define DAY_LONG\
  "You are on what must be the most run-down road in all of Eternal " +\
  "City.  Yet, its eerie sense of permanance invades you, as you realize " +\
  "that this road was the first road ever constructed in this ageless " +\
  "city, and has challenged the test of time, and won.  The road " +\
  "continues to the north and south."

#define ITEM1 ({ "road", "street", "pavement", "ground" })
#define ID1\
  "This is an old, oft-used road."

#define ITEM2 ({ "ditch", "large ditch", "gouges", "deep gouges", "gouge" })
#define ID2\
  "The ditch has been worn into the road by years and years of heavy traffic."

#define ITEM3 ({ "trails", "footprints", "trails of footprints" })
#define ID3\
  "You can see footprints of all shapes and sizes."

#include "room.c"
