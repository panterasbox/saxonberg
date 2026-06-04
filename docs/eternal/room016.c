//  room016.c
#include "/zone/null/eternal/eternal.h"

#define NORTH        "room010"
#define SOUTH        "room020"
#define WEST         "shop3"

#define MAP_SYMBOL "l"

#define DAY_LIGHT    SUNLIGHT
#define NIGHT_LIGHT  DARK

#define OUTSIDE

#define SHORT        "Limbo Lane"
#define DAY_LONG\
  "The road here is constructed with an odd pink substance with a rubbery " +\
  "texture.  To the west, a stucco building painted black can be seen; a " +\
  "sign above the building reads 'Anarchy Interdimensional'.  Limbo Lane " +\
  "continues to the north and south."

#define ITEM1 ({ "road", "street", "pavement", "ground", \
                 "pink substance", "odd pink substance", "substance", \
                 "material", "pink material", "odd pink material" })
#define ID1\
  "This is a strange, pink pavement that feels soft underfoot."

#define ITEM2 ({ "building", "stucco building" })
#define ID2\
  "The building appears to be some sort of shop."

#define ITEM3 "sign"
#define ID3\
  "The sign says, 'Anarchy Interdimensional'."

#define PATROL1  ({"south","north",10})
#define PATROL2  ({"north","north",0})
#define PATROL3  ({"south","south",0})
#define HEART    ({"south","north",5})
 
#include "room.c"
