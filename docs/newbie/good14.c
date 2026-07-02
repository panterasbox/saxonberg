//  Genious: newbie/good14.c
//  Written by Hannah on 12/92

#include "Newbie.h"


void extra_create()
{
    set( "short", "The Mists of Heaven" );
    set( "day_long",
      "You seem to float in midair, among the misty clouds.  This appears "+
      "to be the way to Heaven, the place for those who have done good in "+
      "their lives.  Happy souls drift by you, and you hear the strains "+
      "of melodious harp music." );
    set( "day_light", WELL_LIT );
    set( "exits", ([
      "north" : "good15",
      "down"  : "good13"
    ]) );
    set( "descs", ([
     ({ "clouds", "misty clouds" }):
         "The clouds look like delicate wisps of cotton against a deep blue "+
         "sky.",
     ({ "sky", "blue sky" }):
         "The endless heavens surround and enrapture you.",
     "souls":
         "The souls float by, appearing happy and contented, yet oblivious "+
         "to your presence." 
    ]) );
    set( "reset_data", ([
      "g_angel" : NEWBIE + "Mon/g_angel",
    ]) );
    set( OutsideP, 1 );
}


status query_enter_ok( object ob )
{
    if( living( ob ) && ob->query_alignment() < SAINTLY_AL )
        return( printf(
          "You are not worthy enough to rise to the heavens.\n" ), 1 );
    return( 0 );
}
 
/*  The following was the old query_enter_ok.  It seemed to cause
    problems with cloning the monster into the room because it would
    check THISP which is not always the object that is entering the
    room.
status query_enter_ok()
{
    if( THISP->query_alignment() < SAINTLY_AL )
        return(
          printf( "You are not worthy enough to rise to the heavens.\n" ), 1 );
    return( 0 );
}
*/
