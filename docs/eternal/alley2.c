//  alley2.c
#include "/zone/null/eternal/eternal.h"

/*
#define NORTH           "slave_shop"
*/
#define EAST            "alley3"
#define WEST            "alley1"
#define UP              "drop_dock"

#define MAP_SYMBOL "a"
#define MAP_EAST_UNIT 2
#define MAP_WEST_UNIT 2

#define DAY_LIGHT       SUNLIGHT
#define NIGHT_LIGHT     DARK

#define OUTSIDE

#define SHORT           "Dark Alley"
#define DAY_LONG\
  "You are in a narrow alley between the high-rises of Eternal City.  "\
  "Little light reaches this place, despite the relative brightness of the "\
  "rest of the city.  A rusty fire escape ladder hangs down here."

#include "room.c"
