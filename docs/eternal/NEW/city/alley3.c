//  alley3.c

#include "/zone/null/eternal/eternal.h"

#define NORTH           "alley4"
#define WEST            "alley2"

#define DAY_LIGHT       SUNLIGHT
#define NIGHT_LIGHT     DARK

#define OUTSIDE

#define SHORT           "Dark Alley"
#define DAY_LONG\
    "This is the dark alley between the narrow confines of the massive "+\
    "buildings in Eternal City.  The smell of old garbage is strong here.  "+\
    "The alley continues to the north and west. It looks as if you might "+\
    "possibly be able to squeeze through a narrow gap in the buildings to "+\
    "the east."

#define OBJ1            OBJECTS + "dumpster"

#include "room.c"
