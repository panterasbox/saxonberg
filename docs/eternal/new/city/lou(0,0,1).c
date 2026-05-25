inherit RoomPlusCode;

#include "path.h"
 
#define WALL   "/obj/status/status_w"
 
void extra_create()
{
  set( "short", "EotL Lounge" );
  set( "day_long",
    "Welcome to the End of the Line player lounge.  It consists of a "
    "spacious room filled with lots of couches and easy chairs for "
    "weary adventurers like yourself to relax in.  There is a bar to "
    "the north, and a circular staircase leads down to that renowned "
    "metropolis, Eternal City.  A smaller staircase leads up to a "
    "less hectic and quieter locale.");
  set( "day_light", 60 );
  set( "exits", ([
    "down" : CITY "hea(0,0,0)",
    "up"   : CITY "gam(0,0,2)",
    ]) );
  set( "descs", ([
    ({ "couch", "couches", "chair", "chairs", "easy chairs" }):
      "The couches and chairs look very comfortable and inviting.",
    ({ "staircase", "staircases" }):
      "Which staircase, the circular one or the smaller one?",
    "circular staircase":
      "This staircase has a thick wooden bannister, and spirals down "
      "towards the Heart of the city.",
    "smaller staircase":
      "This staircase, with brass railings, leads upstairs to the "
      "gaming room.",
    "bar":
      "Devo's Bar is to the north.",
    ]) );
  set( "reset_data", ([
    "mac"  : "/usr/locus/open/mac",
    "rtg"  : "/usr/hannah/open/rtg",
    "sign" : "/zone/null/eternal/lounge/sign",
    ]) );
  set( InsideP, 1 );
  set( NoCombatP, 1 );
}
       
void extra_reset()
{
  if ( !present( "wall" ) )
  {
    call_other( WALL, "foo" );
    move_object( WALL, THISO );
  }
}
 
string post_long()
{
  if( random( 200 ) < THISP -> query_player_kills() )
    return 0;
  return( "WARNING: COMBAT IS " + ( query( NoCombatP ) ? "NOT " : "" ) +
    "PERMITTED IN THE LOUNGE.\n" );
}
