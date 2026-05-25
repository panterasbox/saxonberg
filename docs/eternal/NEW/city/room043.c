//  room043.c

#define NORTH           "room034"
#define SOUTH           "room045"
// #define EAST            "quest1"
//  Took the Temple Of Eternity offline as it is wei out of
//  date and has no real purpose anymore.
// -- Tabitha Feb 2 95

#define DAY_LIGHT       SUNLIGHT
#define NIGHT_LIGHT     DARK

#define OUTSIDE

#define SHORT           "Glass Way"
#define DAY_LONG\
     "You are on the polished surface of a wide, glass road.  Colors "+\
     "of all hues reflect from the surface of the glass as light plays "+\
     "upon it.  A palace of pure glass and white steel of immeasurable "+\
     "splendor can be seen to the east.  Glass way continues to the "+\
     "north and south."

#define ITEM1           "palace"
#define ID1\
     "You know it to be Eotl's Palace of Wizards."

#define OBJ1            "/zone/null/eternal/monsters/guard"

#include "room.c"
