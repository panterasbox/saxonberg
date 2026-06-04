//  room042.c
#include "/zone/null/eternal/eternal.h"

#define NORTH        "room033"
#define WEST         "room041"

#define MAP_SYMBOL "o"
#define MAP_WEST_UNIT 3
#define MAP_EXTRA_EAST ({ "?", 0, 0 })

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Old Road, Bend"
#define DAY_LONG\
  "This is where the broken surface of Old Road turns to face the north " +\
  "and east directions.  A sense of awe fills you as you consider the " +\
  "time it has taken to convert the hard surface of this road to the dust " +\
  "it has become."

#define ITEM1 ({ "road", "street", "pavement", "ground" })
#define ID1\
  "This is an old, oft-used road."

#define OBJ1         "/zone/null/eternal/monsters/guard"

#include "room.c"
