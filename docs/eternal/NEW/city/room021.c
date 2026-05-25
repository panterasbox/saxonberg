//  room021.c

#define NORTH        "room017"
#define SOUTH        "room029"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Old Road"
#define DAY_LONG\
  "The uneven road here stands as a testament to the life of Eternal " +\
  "City.  Deep gouges and trails of footprints cover this stretch of road " +\
  "as a result of an eternity of being trodden upon.  The road continues " +\
  "to the north and south."

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
