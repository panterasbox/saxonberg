//  room013.c

#define WEST         "room012"
#define SOUTH        "room017"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Old Road, Intersection"
#define DAY_LONG\
  "The deep gauges of Old Road lead south from here, but are highlighted " \
  "with traces of metallic Silver Street from the west.  To the east the " \
  "ground falls away to reveal a stunning view of the lands east of " \
  "the Eternal City.  The only thing between you and the multiple " \
  "hundreds-of-feet fall is the haze of the Shield, dropping neatly from " \
  "overhead and past you on its way to the cliff base."

#define ITEM1 ({ "silver", "plates", "metal plates", "road", "street", \
                 "pavement", "metal", "gauges" })
#define ID1\
  "The silver-like plates lining the street reverberate with every step " +\
  "you make."

#include "room.c"
