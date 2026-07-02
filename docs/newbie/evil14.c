//  Genious: newbie/evil14.c
//  Written by Hannah on 12/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "The Road to Hell" );
    set( "day_long",
      "The heat rises up from the ground in ripples.  You find yourself "+
      "walking down a road that has been well-traveled for millenia.  You "+
      "begin to sweat profusely, both from the heat and from fear of what "+
      "lies ahead." );
    set( "day_light", NO_LIGHT );
    set( "exits", ([
      "up"   : "evil13",
      "east" : "evil15"
    ]) );
    set( "descs", ([
      "road":
          "The road is extremely ancient...  It is old and worn enough to "+
          "have been here since the dawn of time."
    ]) );
    set( "reset_data", ([ "familiar": NEWBIE + "Mon/familiar" ]) );
    set( UndergroundP, 1 );
    set( InsideP, 1 );
}


status query_enter_ok( object ob )
{
    if( living( ob ) && ob->query_alignment() > DEVILISH_AL )
        return( printf( "You hear the laughing of demons as you attempt " +
          "to enter their domain.\n\n" ), 1 );
   return( 0 );
}
 
/*  The following was the old query_enter_ok.  It seemed to cause
    problems with cloning the monster into the room because it would
    check THISP which is not always the object that is entering the
    room.
status query_enter_ok()
{
   if( THISP->query_alignment() > DEVILISH_AL )
      return( printf( "You hear the laughing of demons as you attempt to "+
        "enter their domain.\n\n" ), 1 );
   return( 0 );
}
*/
