//  room014.c

#define NORTH        "room006"
#define SOUTH        "room018"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Tanelorn Road"
#define DAY_LONG\
  "This is a wide, north-south road lined on the east with a " \
  "continuing row of private buildings, and on the west with " \
  "the Shield, which curves down and past a sheer dropoff.  Upon " \
  "closer inspection, you find that the gravel with which the " \
  "road is covered is composed of ground-up obsidian and oynx " \
  "stones."

#define ITEM1 ({ "gravel", "black gravel", "road" })
#define ID1\
  "The black gravel surfacing the road is nothing more than finely crushed " +\
  "black rock."

#include "room.c"
