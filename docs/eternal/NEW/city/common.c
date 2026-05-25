#define NORTH    "room019"
#define SOUTH    "room031"
#define EAST     "room026"
#define WEST     "room025"
#define DOWN     "operations"
#define UP       "lounge"
 
#define DAY_LIGHT       SUNLIGHT
#define NIGHT_LIGHT     DARK

#define OUTSIDE

#define SHORT    "Heart of Eternal City"
#define DAY_LONG\
  "This is the center of Eternal City, the city of infinity.  All " + \
  "around you stand buildings, large and small, all colored with a " + \
  "variety of hues that almost appear to have withstood the test of " + \
  "time, even before time itself had begun.  A large hole, off to " + \
  "one side, with iron rungs attached to one of its sides descends " + \
  "beneath the earth here.  Roads from each point on the compass " + \
  "lead off to even more wonder.  " + \
  "A spiral staircase leads up here."
 
#define ITEM1    ({ "buildings", "roads" })
#define ID1      "You should travel around the city and check them out."
 
#define ITEM2    "hole"
#define ID2      "It appears to be a manhole."
 
#define ITEM3    ({ "staircase", "spiral staircase" })
#define ID3      "It looks very inviting."
 
#include "room.c"
