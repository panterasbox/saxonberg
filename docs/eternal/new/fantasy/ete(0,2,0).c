inherit RoomPlusCode;
 
#include "path.h"
 
void extra_create()
{
  set( "ansi_short", WHT "Eternal Way" );
  set( "short", "Eternal Way" );
  set( "day_color", WHT );
  set( "day_long",
    "You are on a road covered beneath a thick blanket of "
    "fog.  Something unseen slithers over your lower legs "
    "as you wade through the odd stuff.  Eternal Way "
    "continues to the north and south." );
  set( "exits", ([
    "north" : CITY "ete(0,3,0)",
    "south" : CITY "ete(0,1,0)",
    ]) );
  set( "day_light", SUNLIGHT );
  set( "night_light", DARK );
  set( OutsideP, 1 );
  set( "descs", ([
    ({ "road", "street", "pavement", "ground" }) :
      "You can't see the road because of the wisps of fog "
      "covering it.",
    ({ "fog", "blanket of fog", "mist", "wide mist", "wisps" }) :
      "The strange fog covers the road like a delicate, "
      "grey blanket.",
    ]) );
}
