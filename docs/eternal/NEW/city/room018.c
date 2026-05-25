//  room018.c

#define NORTH        "room014"
#define SOUTH        "room022"
#define WEST         "adventurer1"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Tanelorn Road"
#define DAY_LONG\
  "Every step you take initiates the sound of crunching glass and " +\
  "grinding pebbles as you walk upon the ground up, gem-like surface of " +\
  "this road.  The light-blue paint of a building to your west captures " +\
  "your attention.  Tanelorn Road continues to the north, while Limbo " +\
  "Lane can be seen to the south." 

#define ITEM1 ({ "gravel", "black gravel", "road", "glass", "pebbles" })
#define ID1\
  "The black gravel surfacing the road is nothing more than finely crushed " +\
  "black rock."

#define ITEM2 ({ "building", "blue building" })
#define ID2\
  "The building appears to be some sort of guildhouse."

#include "room.c"
