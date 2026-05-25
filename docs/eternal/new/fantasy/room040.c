//  room040.c

#define WEST         "room039"
#define EAST         "room041"
#define NORTH        "alley5"
#define SOUTH        "alley4"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Old Road"
#define DAY_LONG\
  "The remains of a paved surface lie here in its own dust after ages of " +\
  "being traveled upon.  Old Road was the first street constructed within " +\
  "Eternal City and remains as a monument to its defiance of time.  The " +\
  "road continues to the east and west."

#define ITEM1 ({ "road", "street", "pavement", "ground", "surface" })
#define ID1\
  "This is an old, oft-used road."

#define ITEM2 ({ "ditch", "large ditch", "gouges", "deep gouges", "trough" })
#define ID2\
  "The ditch has been worn into the road by years and years of heavy traffic."

#include "room.c"
