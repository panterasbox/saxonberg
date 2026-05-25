/* room036 */

#define EAST    "room037"
#define WEST    "room035"

#define DAY_LIGHT   20
#define NIGHT_LIGHT 10

#define SHORT       "Eternal Way"
#define DAY_LONG\
   "A cloudy mist floats a few inches above the street here, faint " +\
   "wisps of which billow up around you as you move about the city.  " +\
   "Eternal Way continues to the east and west."\

#define OUTSIDE

#include "room.c"

extra_reset()
{
	if(!present("nympho_entry", THISO))
move_object(clone_object("/zone/null/pucella/entry"),THISO);
}
