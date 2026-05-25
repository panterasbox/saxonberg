//  room024.c
#include "/zone/null/eternal/eternal.h"

#define EAST            "room025"
#define WEST            "room023"
#define NORTH           "clothiers"

#define MAP_SYMBOL "l"

#define DAY_LIGHT       SUNLIGHT
#define NIGHT_LIGHT     DARK

#define OUTSIDE

#define SHORT           "Limbo Lane"
#define DAY_LONG\
   "You are standing on a wide road paved with an unusual spongy " +\
   "substance that almost glows pink in intensity.  Hanging from a " +\
   "large building to the north is a white sign, with a stylized " +\
   "\"A & A\" in bold black letters.  The window displays in the " +\
   "front of the building contain a mind-boggling variety of apparel.  " +\
   "Limbo Lane continues to the east and west."

#define PATROL1  ({"west","west",0})
#define PATROL2  ({"east","east",0})
#define PATROL3  ({"east","west",9})
#define HEART    ({"east","west",2})
 
#include "room.c"
