/* room037 */
#include "/zone/null/eternal/eternal.h"

#define NORTH   "room031"
#define WEST    "room036"

#define MAP_SYMBOL "e"

#define DAY_LIGHT   20
#define NIGHT_LIGHT 10

#define SHORT       "Eternal Way, Bend"
#define DAY_LONG\
   "This is where Eternal Way bends in a north-west direction.  A faint " + \
   "haze covers the floor here so that the true nature of the road " + \
   "cannot be seen.  To the south, there is an building that appears " + \
   "extremely high-tech.  Eternal Way continues to the north and west."

#define ITEM1  ({ "haze", "fog", "mist", "floor", "road", \
                  "eternal way", "way", "eternal", "Eternal Way" })
#define ID1    "A faint but tenacious mist coats the road upon which " \
               "you are standing.  Attempts to blow away the fog simply " \
               "stir the haze about while somehow keeping the road's " \
               "composition a complete mystery.  Weird-ass."
#define ITEM2  ({ "building", "south", "high-tech building" })
#define ID2    "It's a pretty futuristic, slick-lookin' building, but " \
               "sadly it is rather heavily boarded up with rough-hewn " \
               "planks.  The entrance could definitely be considered " \
               "to be impassable."
#define ITEM3  ({ "planks", "plank", "boards", "board", \
                  "entrance", "rough-hewn planks" })
#define ID3    "Despite your apparant fascination with the boarded up " \
               "entrance, it seems to still be completely impassable."

#define OUTSIDE

#define PATROL1  ({"west","north",17})
#define PATROL2  ({"north","north",0})
#define PATROL3  ({"north","north",0})
#define HEART    ({"north","west",2})
 
#include "room.c"
