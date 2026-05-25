inherit RoomPlusCode;
 
#include "path.h"
 
void extra_create()
{
  set( "ansi_short", WHT "Eternal Way" );
  set( "short", "Eternal Way" );
  set( "day_color", WHT );
  set( "day_long",
    "This is a wide street traveling through the center of "
    "Eternal City.  An eerie mist drifts a few inches above "
    "the pavement, failing to reveal the true nature of the "
    "road you walk upon.  Eternal Way continues to the north "
    "and to the south, into the heart of Eternal City." );
  set( "exits", ([
    "north" : CITY "ete(0,2,0)",
    "south" : CITY "hea(0,0,0)",
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
