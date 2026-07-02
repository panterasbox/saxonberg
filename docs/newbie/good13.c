//  Genious: newbie/good13.c
//  Written by Hannah on 12/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "Stairway to Heaven" );
    set( "day_long",
      "This is an ethereal stairway, enshrouded in mists.  You see many "+
      "ghostly figures climbing up.....up.....for what seems to be an "+
      "eternity.  The stairway appears to go so high that the top is "+
      "obscured by a cloud cover." );
    set( "day_light", PART_LIT );
    set( "exits", ([
      "up"   : "good14",
      "down" : "good09"
    ]) );
    set( "descs", ([
      ({ "stairway", "stairs", "steps" }):
          "At first the individual steps appear to be made of wood, but the "+
          "air around you is hazy, and plays tricks on your eyes... and the "+
          "steps no longer appear solid, yet you don't fall through them...",
      ({ "mists", "mist" }):
          "The mists seem other-worldly, caressing your skin, yet without "+
          "moisture...",
      ({ "figures", "ghostly figures", "souls", "soul" }):
          "The figures appear to be the souls of the recently-departed.",
      ({ "cloud", "cloud cover", "clouds" }):
          "The clouds above you are a bright white.  Golden rays of light "+
          "emit from behind them."
    ]) );
    set( InsideP, 1 );
}


status query_enter_ok()
{
   if( THISP->query_alignment() < SAINTLY_AL )
      return(
        printf( "You are not worthy enough to rise to the heavens.\n" ), 1 );
   return( 0 );
}
