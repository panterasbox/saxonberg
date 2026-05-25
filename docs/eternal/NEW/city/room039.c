//  room039.c

#define WEST         "room038"
#define EAST         "room040"
#define NORTH        "warrior/warrior1"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Old Road"
#define DAY_LONG\
  "This is a road that appears to have been once paved with a cement-like " +\
  "mixture, but has long since deteriorated after eons of being trodden " +\
  "upon.  A high wooden fence to the surrounds a decent plot of land to " +\
  "the north; an open gate allows access from the road.  Old Road " +\
  "continues to the east and west."

#define ITEM1 ({ "road", "street", "pavement", "ground", "surface" })
#define ID1\
  "This is an old, oft-used road."

#define ITEM2 ({ "ditch", "large ditch", "gouges", "deep gouges", "trough" })
#define ID2\
  "The ditch has been worn into the road by years and years of heavy traffic."

#define ITEM3 ({ "fence", "wooden fence", "high wooden fence" })
#define ID3\
  "The fence is too high for you to look over."

#include "room.c"
