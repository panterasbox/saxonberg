/* room036 */
#include "/zone/null/eternal/eternal.h"
 
#define EAST    "room037"
#define WEST    "room035"
#define NORTH   "lot"
 
#define MAP_SYMBOL "e"
#define DAY_LIGHT   20
#define NIGHT_LIGHT 10
 
#define SHORT       "Eternal Way"
#define DAY_LONG\
   "A cloudy mist floats a few inches above the street here, faint " +\
   "wisps of which billow up around you as you move about the city.  "+\
   "Eternal Way continues to the east and west.  "+\
   ""
#define OUTSIDE
 
#define PATROL1  ({"west","east",18})
#define PATROL2  ({"east","east",0})
#define PATROL3  ({"west","west",0})
#define HEART    ({"east","west",3})
 
#include "room.c"
