/*
** Oracle Room
*/
 
#include "/zone/null/eternal/eternal.h"
inherit RoomCode;
 
void extra_create()
{
    set( "map_symbol", "O" );
    set( "short", "Transdimensional Intermultiversial Oracle" );
    set( "day_long",
      "A strange silence permeates the atmosphere of this "+
      "park-like area.  Well groomed grass and the smell of "+
      "running water only increases the feelings of "+
      "unnatural intervention here.  A makeshift altar of "+
      "pillars arranged in a semi-circular pattern dominates "+
      "the attention of the area, and you eventually wander "+
      "over to it, finding an odd, glinting, machine made of "+
      "stainless steel and gold resting just before the rear"+
      "-most column in the arrangement." );
 
    set( "day_light", WELL_LIT );
    set( "night_light", DIM );
 
    set( "exits", ([ "north" : "room049", ]) );
    set( "reset_data",
       ([ "oracle" : "/zone/null/eternal/objects/oracle" ]) );
}
